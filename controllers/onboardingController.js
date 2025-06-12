// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
// const UserAnswers = require('../models/UserAnswers'); // Not used in this controller

// Middleware to protect routes (if needed)
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
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

// Controller to save onboarding answers
const saveAnswers = async (req, res) => {
  try {
    console.log('Received body:', req.body);

    const { userId, interests } = req.body;
    // Log the extracted data
    console.log('userId:', userId);
    console.log('interests:', interests);

    // Update the user's interests
    const user = await User.findByIdAndUpdate(
      userId,
      { interests },
      { new: true }
    );

    if (!user) {
      console.error('User not found for ID:', userId);
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (err) {
    console.error('Error saving onboarding answers:', err); // Log the error
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

module.exports = {
    saveAnswers,
    protect
};
