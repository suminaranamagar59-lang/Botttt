require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const axios = require('axios');
const crypto = require('crypto');
const User = require('./models/User');

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.FRONTEND_URL }));

// Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

// Email Transporter Setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

// Middleware to Verify JWT
const verifyToken = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access Denied' });
    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).json({ message: 'Invalid Token' });
    }
};

// --- API ROUTES ---

// 1. Register
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, captchaToken } = req.body;

    // Verify Captcha
    const captchaVerify = await axios.post(`https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${captchaToken}`);
    if (!captchaVerify.data.success || captchaVerify.data.score < 0.5) {
        return res.status(400).json({ message: 'Captcha failed. Bot detected.' });
    }

    try {
        if (await User.findOne({ email })) return res.status(400).json({ message: 'Email already exists' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const verificationToken = crypto.randomBytes(20).toString('hex');

        const newUser = new User({ name, email, password: hashedPassword, verificationToken });
        await newUser.save();

        // Send Verification Email
        const verifyUrl = `${process.env.FRONTEND_URL}/index.html?verify=${verificationToken}`;
        await transporter.sendMail({
            to: email,
            subject: 'Verify your Account',
            html: `<p>Click <a href="${verifyUrl}">here</a> to verify your email.</p>`
        });

        res.status(201).json({ message: 'Registration successful. Please check your email to verify.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Login
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'User not found' });
        if (!user.isVerified) return res.status(400).json({ message: 'Please verify your email first' });

        const validPass = await bcrypt.compare(password, user.password);
        if (!validPass) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, message: 'Logged in successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. Get User Data (Dashboard)
app.get('/api/auth/me', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
