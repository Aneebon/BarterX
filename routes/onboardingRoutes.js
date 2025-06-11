const express = require('express');
const router = express.Router();
const { saveOnboardingAnswers } = require('../controllers/onboardingController');

router.post('/save-answers', saveOnboardingAnswers);

router.get('/user-by-email', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Missing email' });
  const User = require('../models/User');
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

module.exports = router;