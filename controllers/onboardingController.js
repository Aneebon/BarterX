// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const UserAnswers = require('../models/UserAnswers');

const protect = (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Attach user to the request object
            req.user = { id: decoded.id }; // Assuming your token payload has 'id' (which is the user's MongoDB _id)

            next(); // Proceed to the next middleware/route handler
        } catch (error) {
            console.error('Auth middleware error:', error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const saveOnboardingAnswers = async (req, res) => {
  const { userId, interests } = req.body;
  if (!userId || !interests) return res.status(400).json({ error: 'Missing data' });
  try {
    await User.findByIdAndUpdate(
      userId,
      { $set: { interests } }
    );
    res.json({ success: true, message: 'Interests saved to user profile!' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
    saveOnboardingAnswers
};