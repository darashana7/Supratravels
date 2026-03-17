const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
    title:    { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    price:    { type: Number, required: true, min: 0 },
    duration: { type: String, required: true },
    image:    { type: String, required: true },    // Cloudinary URL
    imageId:  { type: String, default: '' },       // Cloudinary public_id for deletion
    badge:    { type: String, default: '' },
    order:    { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Trip', tripSchema);
