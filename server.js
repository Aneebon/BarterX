const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config(); // Load environment variables from .env file

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Import bcrypt for password hashing
const User = require('./models/User'); // Import your User model

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB Atlas!'))
    .catch(err => console.error('MongoDB connection error:', err));

const app = express();
app.use(cors()); // Allow requests from your frontend
app.use(bodyParser.json()); // To parse JSON request bodies

// Nodemailer transporter setup using environment variables
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

// --- API Endpoints ---

// Signup endpoint: Registers a user and sends a verification code
app.post('/api/signup', async (req, res) => {
    const { name, email, password } = req.body;

    // Basic validation
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    try {
        // 1. Check if user already exists in the database
        let user = await User.findOne({ email });

        if (user) {
            // If user exists and is already verified, deny registration
            if (user.isVerified) {
                return res.status(409).json({ error: 'Email already registered and verified. Please log in.' });
            }
            // If user exists but is NOT verified, update their info and resend code
            user.name = name;
            user.password = await bcrypt.hash(password, 10); // Hash and update password
            user.verificationCode = Math.floor(100000 + Math.random() * 900000).toString(); // New code
            user.codeExpiry = new Date(Date.now() + 10 * 60 * 1000); // New expiry
            // isVerified remains false
        } else {
            // 2. If it's a completely new user, hash the password
            const hashedPassword = await bcrypt.hash(password, 10);

            // 3. Generate a 6-digit verification code and its expiry
            const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
            const codeExpiry = new Date(Date.now() + 10 * 60 * 1000); // Code valid for 10 minutes

            // 4. Create a new User document
            user = new User({
                name,
                email,
                password: hashedPassword, // Store the hashed password
                verificationCode,
                codeExpiry,
                isVerified: false // New users are not verified by default
                // interests and modes will default to empty arrays as defined in the schema
            });
        }

        // 5. Save or update the user document in MongoDB
        await user.save();
        console.log('User saved/updated in DB:', user.email);

        // 6. Send verification email
        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: email,
            subject: 'BarterX Email Verification Code',
            html: `
                <p style="font-family: Arial, sans-serif; font-size: 16px;">Hello ${name},</p>
                <p style="font-family: Arial, sans-serif; font-size: 16px;">Thank you for signing up for BarterX! To complete your registration, please use the following verification code:</p>
                <h2 style="font-family: Arial, sans-serif; color: #2E7D32; font-size: 28px; font-weight: bold; text-align: center; background-color: #f0f0f0; padding: 15px; border-radius: 8px;">${user.verificationCode}</h2>
                <p style="font-family: Arial, sans-serif; font-size: 14px; color: #777;">This code is valid for 10 minutes.</p>
                <p style="font-family: Arial, sans-serif; font-size: 14px;">If you did not request this, please ignore this email.</p>
                <p style="font-family: Arial, sans-serif; font-size: 14px;">Best regards,<br>The BarterX Team</p>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`Verification email sent to ${email}`);
        res.status(201).json({ message: 'Registration successful! Verification code sent to your email. Please check your inbox and spam folder.' });

    } catch (err) {
        console.error('Registration error:', err);
        // Handle duplicate key error (email unique constraint in MongoDB)
        if (err.code === 11000 && err.keyPattern && err.keyPattern.email) {
            return res.status(409).json({ error: 'This email is already registered.' });
        }
        res.status(500).json({ error: 'Registration failed: ' + err.message });
    }
});

// Verify endpoint: Verifies the email using the code
app.post('/api/verify', async (req, res) => {
    const { email, code } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: 'User not found. Please sign up first.' });
        }
        if (user.isVerified) {
            return res.status(400).json({ error: 'Email already verified.' });
        }
        if (user.codeExpiry < new Date()) {
            return res.status(400).json({ error: 'Verification code has expired. Please sign up again to receive a new code.' });
        }
        if (user.verificationCode !== code) {
            return res.status(400).json({ error: 'Invalid verification code.' });
        }

        // Mark user as verified
        user.isVerified = true;
        user.verificationCode = undefined;
        user.codeExpiry = undefined;
        await user.save();

        res.status(200).json({ message: 'Email verified successfully! You can now log in.' });

    } catch (err) {
        console.error('Verification error:', err);
        res.status(500).json({ error: 'Email verification failed.' + err.message });
    }
});

// Login endpoint: Authenticates the user
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: 'User not found. Please sign up first.' });
        }
        if (!user.isVerified) {
            return res.status(401).json({ error: 'Please verify your email before logging in.' });
        }
        
        // Compare provided password with hashed password from DB
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // In a real application, you'd generate a JWT token here for session management
        res.status(200).json({
            message: 'Login successful!',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                interests: user.interests,
                modes: user.modes, // Include modes in login response
                userType: user.userType, // Include userType
                contactNumber: user.contactNumber, // Include contactNumber
                city: user.city, // Include city
                state: user.state, // Include state
                country: user.country, // Include country
                profilePicture: user.profilePicture // Include profilePicture
            }
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed.' + err.message });
    }
});

// --- NEW: Forgot Password - Request OTP endpoint ---
app.post('/api/forgot-password-request-otp', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required.' });
    }

    try {
        const user = await User.findOne({ email });

        if (!user) {
            // Do not reveal if email is registered or not for security reasons
            return res.status(200).json({ message: 'If an account with that email exists, a password reset code has been sent.' });
        }

        // Generate a new 6-digit verification code for password reset
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const codeExpiry = new Date(Date.now() + 10 * 60 * 1000); // Code valid for 10 minutes

        user.resetPasswordToken = verificationCode;
        user.resetPasswordExpires = codeExpiry;
        await user.save();

        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: email,
            subject: 'BarterX Password Reset Code',
            html: `
                <p style="font-family: Arial, sans-serif; font-size: 16px;">Hello ${user.name || 'User'},</p>
                <p style="font-family: Arial, sans-serif; font-size: 16px;">You requested a password reset for your BarterX account. Please use the following code to reset your password:</p>
                <h2 style="font-family: Arial, sans-serif; color: #2E7D32; font-size: 28px; font-weight: bold; text-align: center; background-color: #f0f0f0; padding: 15px; border-radius: 8px;">${verificationCode}</h2>
                <p style="font-family: Arial, sans-serif; font-size: 14px; color: #777;">This code is valid for 10 minutes.</p>
                <p style="font-family: Arial, sans-serif; font-size: 14px;">If you did not request a password reset, please ignore this email.</p>
                <p style="font-family: Arial, sans-serif; font-size: 14px;">Best regards,<br>The BarterX Team</p>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`Password reset OTP sent to ${email}`);
        res.status(200).json({ message: 'If an account with that email exists, a password reset code has been sent.' });

    } catch (err) {
        console.error('Forgot password request error:', err);
        res.status(500).json({ error: 'Failed to send password reset code: ' + err.message });
    }
});

// --- NEW: Forgot Password - Verify OTP endpoint ---
app.post('/api/forgot-password-verify-otp', async (req, res) => {
    const { email, code } = req.body;

    if (!email || !code) {
        return res.status(400).json({ error: 'Email and verification code are required.' });
    }

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        if (!user.resetPasswordToken || user.resetPasswordToken !== code) {
            return res.status(400).json({ error: 'Invalid verification code.' });
        }
        if (user.resetPasswordExpires < new Date()) {
            return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
        }

        // OTP is valid. User can now proceed to reset password or log in with old password.
        // We don't clear the resetPasswordToken/Expires here, as the user might choose
        // to continue with the old password. It will be cleared upon successful password reset.
        res.status(200).json({ message: 'Verification successful! You can now reset your password or log in with your existing one.' });

    } catch (err) {
        console.error('Forgot password OTP verification error:', err);
        res.status(500).json({ error: 'Failed to verify OTP: ' + err.message });
    }
});

// --- NEW: Reset Password endpoint ---
app.post('/api/reset-password', async (req, res) => {
    const { email, code, newPassword } = req.body; // 'code' acts as the token here

    if (!email || !code || !newPassword) {
        return res.status(400).json({ error: 'Email, verification code, and new password are required.' });
    }

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        if (!user.resetPasswordToken || user.resetPasswordToken !== code) {
            return res.status(400).json({ error: 'Invalid or expired verification code.' });
        }
        if (user.resetPasswordExpires < new Date()) {
            return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
        }

        // Hash the new password
        user.password = await bcrypt.hash(newPassword, 10);
        user.resetPasswordToken = undefined; // Clear the token
        user.resetPasswordExpires = undefined; // Clear the expiry
        await user.save();

        res.status(200).json({ message: 'Your password has been successfully reset!' });

    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ error: 'Failed to reset password: ' + err.message });
    }
});

// --- END OF NEW FORGOT PASSWORD ENDPOINTS ---

// --- ENDPOINT TO COMPLETE ONBOARDING AND UPDATE USER PROFILE ---
app.post('/api/complete-onboarding', async (req, res) => {
    const { email, interests, modes, userType, contactNumber, city, state, country, profilePicture } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'User email is required for onboarding completion.' });
    }

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Update fields if they exist in the request body
        if (interests && Array.isArray(interests)) {
            user.interests = interests;
        }
        if (modes && Array.isArray(modes)) {
            user.modes = modes;
        }
        if (userType) {
            user.userType = userType;
        }
        if (contactNumber) {
            user.contactNumber = contactNumber;
        }
        if (city) {
            user.city = city;
        }
        if (state) {
            user.state = state;
        }
        if (country) {
            user.country = country;
        }
        if (profilePicture) {
            user.profilePicture = profilePicture;
        }

        await user.save();

        // Respond with the updated user object so frontend can update its localStorage
        res.status(200).json({ message: 'Onboarding complete! Profile updated successfully.', user: user });

    } catch (err) {
        console.error('Error completing onboarding:', err);
        res.status(500).json({ error: 'Failed to complete onboarding: ' + err.message });
    }
});
// --- END OF ONBOARDING ENDPOINT ---

const onboardingRoutes = require('./routes/onboardingRoutes'); // Make sure this is imported
app.use('/api/onboarding', onboardingRoutes); // Mount your new routes here

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});