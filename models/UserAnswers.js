// models/UserAnswers.js
const mongoose = require('mongoose');

const UserAnswersSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to the User model
        required: true,
        unique: true // Each user submits these answers only once
    },
    // Assuming your HTML has questions named q1, q2, q3 etc.
    q1: { type: String, required: true },
    q2: String, // This is your interests question
    q3: String,
    q4: String,
    q5: String,
    q6: String,
    q7: String,
    q8: String,
    q9: String,
    q10: String,
    submittedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('UserAnswers', UserAnswersSchema);