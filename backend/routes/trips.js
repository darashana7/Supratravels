const express    = require('express');
const multer     = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const Trip       = require('../models/Trip');
const auth       = require('../middleware/auth');
const router     = express.Router();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer → Cloudinary storage
const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder:         'supratravels/trips',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation:  [{ width: 900, height: 600, crop: 'fill', quality: 'auto' }]
    }
});
const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } }); // 8 MB limit

// ── PUBLIC ─────────────────────────────────────────────
// GET /api/trips  – all trips (for the public website)
router.get('/', async (_req, res) => {
    try {
        const trips = await Trip.find().sort({ order: 1, createdAt: 1 });
        res.json(trips);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── PROTECTED ──────────────────────────────────────────
// POST /api/trips  – create new trip with image upload
router.post('/', auth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Image file is required' });

        const trip = new Trip({
            title:    req.body.title,
            location: req.body.location,
            price:    Number(req.body.price),
            duration: req.body.duration,
            badge:    req.body.badge || '',
            order:    Number(req.body.order) || 0,
            image:    req.file.path,
            imageId:  req.file.filename
        });

        await trip.save();
        res.status(201).json(trip);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/trips/:id  – update trip (image optional)
router.put('/:id', auth, upload.single('image'), async (req, res) => {
    try {
        const trip = await Trip.findById(req.params.id);
        if (!trip) return res.status(404).json({ error: 'Trip not found' });

        // If a new image was uploaded, delete old one from Cloudinary
        if (req.file) {
            if (trip.imageId) {
                await cloudinary.uploader.destroy(trip.imageId).catch(() => {});
            }
            trip.image   = req.file.path;
            trip.imageId = req.file.filename;
        }

        trip.title    = req.body.title    ?? trip.title;
        trip.location = req.body.location ?? trip.location;
        trip.price    = req.body.price    ? Number(req.body.price) : trip.price;
        trip.duration = req.body.duration ?? trip.duration;
        trip.badge    = req.body.badge    ?? trip.badge;
        trip.order    = req.body.order    !== undefined ? Number(req.body.order) : trip.order;

        await trip.save();
        res.json(trip);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/trips/:id
router.delete('/:id', auth, async (req, res) => {
    try {
        const trip = await Trip.findByIdAndDelete(req.params.id);
        if (!trip) return res.status(404).json({ error: 'Trip not found' });

        // Delete image from Cloudinary
        if (trip.imageId) {
            await cloudinary.uploader.destroy(trip.imageId).catch(() => {});
        }

        res.json({ message: 'Trip deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
