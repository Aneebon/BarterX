// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Import bcrypt for password hashing

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
    // This is the new, structured interests array for survey answers
    interests: {
        type: [{
            question: { type: String, required: true },
            // Use mongoose.Schema.Types.Mixed for 'answer' as it can be a string or an array
            answer: { type: mongoose.Schema.Types.Mixed, required: true }
        }],
        default: []
    },
    modes: {
        type: [String],
        default: []
    },
    userType: {
        type: String,
        enum: ['individual', 'seller'],
        default: 'individual'
    },
    contactNumber: String,
    city: String,
    state: String,
    country: String,
    profilePicture: String,
    // Fields for password reset functionality (from your server.js logic)
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    // Optional: Fields for search history and interactions if you plan to track them
    search_history: [
        {
            query: String,
            timestamp: { type: Date, default: Date.now }
        }
    ],
    interactions: [
        {
            item_id: String,
            type: String, // e.g., "click", "view", "like"
            duration: Number // e.g., in seconds
        }
    ]
}, { timestamps: true }); // Automatically adds createdAt and updatedAt fields

// Pre-save hook to hash password before saving (if it's modified)
userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

module.exports = mongoose.model('User', userSchema);
