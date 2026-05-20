const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
require('dotenv').config();

const authRoutes  = require('./routes/auth');
const tripRoutes  = require('./routes/trips');
const configRoutes = require('./routes/config');
const rideRoutes   = require('./routes/rideshare');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ───────────────────────────────────────────
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiter – 100 requests / 15 min per IP
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// ── Routes ───────────────────────────────────────────────
app.use('/api/auth',   authRoutes);
app.use('/api/trips',  tripRoutes);
app.use('/api/config', configRoutes);
app.use('/api/rideshare', rideRoutes);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));

// ── DB + Start ───────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('✅ MongoDB connected');
        app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
    })
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });
