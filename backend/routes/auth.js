const express  = require('express');
const jwt      = require('jsonwebtoken');
const bcrypt   = require('bcryptjs');
const router   = express.Router();

// In a production app you'd store the hashed password in the DB.
// Here we use env vars for simplicity (single-admin setup).
// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password)
        return res.status(400).json({ error: 'Username and password required' });

    const isValidUser = username === process.env.ADMIN_USERNAME;
    const isValidPass = password === process.env.ADMIN_PASSWORD;

    if (!isValidUser || !isValidPass)
        return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
        { username, role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
    );

    res.json({ token, expiresIn: 28800, username });
});

// POST /api/auth/verify  – check if token is still valid
router.post('/verify', (req, res) => {
    const header = req.headers['authorization'];
    if (!header) return res.status(401).json({ valid: false });
    const token = header.startsWith('Bearer ') ? header.slice(7) : header;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({ valid: true, username: decoded.username });
    } catch {
        res.status(401).json({ valid: false });
    }
});

module.exports = router;
