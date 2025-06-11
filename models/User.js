// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    verificationCode: String,
    codeExpiry: Date,
    isVerified: {
        type: Boolean,
        default: false
    },
    interests: {
        type: [String], // Array of strings for interests
        default: []
    },
    modes: { // <--- ADD THIS FIELD for exchange modes
        type: [String],
        default: []
    },
    userType: { // <--- OPTIONAL: Add user type (individual/seller)
        type: String,
        enum: ['individual', 'seller'],
        default: 'individual'
    },
    contactNumber: String, // <--- OPTIONAL: Add contact number
    city: String, // <--- OPTIONAL: Add city
    state: String, // <--- OPTIONAL: Add state
    country: String, // <--- OPTIONAL: Add country
    profilePicture: String, // <--- OPTIONAL: If you save base64 string or URL
    preferences: {
        topics: [String],
        answered: [
            {
                q: String,
                a: String
            }
        ]
    },
    search_history: [
        {
            query: String,
            timestamp: { type: Date, default: Date.now }
        }
    ],
    interactions: [
        {
            item_id: String,
            type: String,
            duration: Number
        }
    ]
});

module.exports = mongoose.model('User', userSchema);
