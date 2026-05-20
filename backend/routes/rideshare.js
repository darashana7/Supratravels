const express   = require('express');
const RideShare = require('../models/RideShare');
const auth      = require('../middleware/auth');
const router    = express.Router();

// ── PUBLIC ROUTES ──────────────────────────────────────────

// GET /api/rideshare - Get all active ride postings sorted by travel date ascending
router.get('/', async (req, res) => {
    try {
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0); // Include today's trips
        
        // Find active trips that are scheduled for today or in the future
        const rides = await RideShare.find({
            status: 'active',
            date: { $gte: currentDate }
        }).sort({ date: 1, createdAt: 1 });
        
        res.json(rides);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/rideshare - Create a new co-travel / ride pooling request
router.post('/', async (req, res) => {
    try {
        const { name, phone, email, date, from, to, seats, type } = req.body;
        
        if (!name || !phone || !date || !from || !to || !seats || !type) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        const ride = new RideShare({
            name,
            phone,
            email: email || '',
            date: new Date(date),
            from,
            to,
            seats: Number(seats),
            type,
            status: 'active'
        });
        
        await ride.save();
        res.status(201).json(ride);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── PROTECTED ROUTES (ADMIN) ────────────────────────────────

// DELETE /api/rideshare/:id - Remove or complete a co-travel request
router.delete('/:id', auth, async (req, res) => {
    try {
        const ride = await RideShare.findByIdAndDelete(req.params.id);
        if (!ride) return res.status(404).json({ error: 'Ride share posting not found' });
        
        res.json({ message: 'Ride share posting deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
