const express = require('express');
const Config  = require('../models/Config');
const auth    = require('../middleware/auth');
const router  = express.Router();

// Helper — upsert a config key
async function upsert(key, value) {
    return Config.findOneAndUpdate({ key }, { key, value }, { upsert: true, new: true });
}

// ── PUBLIC ─────────────────────────────────────────────
// GET /api/config/contact
router.get('/contact', async (_req, res) => {
    try {
        const doc = await Config.findOne({ key: 'contact' });
        res.json(doc ? doc.value : {
            phone:    '+91 98765 43210',
            whatsapp: '919876543210',
            email:    'info@supratravels.in',
            address:  '124 Travel Avenue, Jubilee Hills, Hyderabad – 500033'
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/config/settings
router.get('/settings', async (_req, res) => {
    try {
        const doc = await Config.findOne({ key: 'settings' });
        res.json(doc ? doc.value : {
            heroHeadline: 'Explore The World With Supra Tours & Travels',
            heroSubtext:  'Your perfect vacation starts here.',
            aboutText:    'With years of experience in the travel industry...'
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PROTECTED ──────────────────────────────────────────
// PUT /api/config/contact
router.put('/contact', auth, async (req, res) => {
    try {
        const doc = await upsert('contact', req.body);
        res.json(doc.value);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/config/settings
router.put('/settings', auth, async (req, res) => {
    try {
        const doc = await upsert('settings', req.body);
        res.json(doc.value);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
