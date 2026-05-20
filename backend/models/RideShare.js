const mongoose = require('mongoose');

const rideShareSchema = new mongoose.Schema({
    name:      { type: String, required: true, trim: true },
    phone:     { type: String, required: true, trim: true },
    email:     { type: String, trim: true },
    date:      { type: Date, required: true },
    from:      { type: String, required: true, trim: true },
    to:        { type: String, required: true, trim: true },
    seats:     { type: Number, required: true, min: 1, default: 1 },
    type:      { type: String, required: true, enum: ['seeking', 'offering'] },
    status:    { type: String, default: 'active', enum: ['active', 'completed', 'cancelled'] }
}, { timestamps: true });

module.exports = mongoose.model('RideShare', rideShareSchema);
