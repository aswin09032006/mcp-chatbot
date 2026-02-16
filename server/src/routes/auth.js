const express = require('express');
const router = express.router ? express.Router() : express.Router; // Safe check
const { google } = require('googleapis');
const User = require('../models/User');

const appRouter = express.Router();

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || `${process.env.SERVER_URL || 'http://localhost:5000'}/auth/google/callback`
);

// Scopes for Google Access
const SCOPES = [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/contacts'
];

/**
 * GET /auth/google
 * Redirect to Google Auth
 */
appRouter.get('/google', (req, res) => {
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline', // Request refresh token
        scope: SCOPES,
        prompt: 'consent' // Force consent to ensure refresh token is returned
    });
    res.redirect(url);
});

/**
 * GET /auth/google/callback
 * Handle Google Code
 */
appRouter.get('/google/callback', async (req, res) => {
    const { code } = req.query;

    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // Get User Info
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();

        // Find or Create User
        let user = await User.findOne({ googleId: userInfo.data.id });

        if (!user) {
            user = new User({
                googleId: userInfo.data.id,
                email: userInfo.data.email,
                name: userInfo.data.name,
                picture: userInfo.data.picture,
                tokens: tokens // Store tokens for offline access (Calendar, etc.)
            });
        } else {
            // Update tokens
            user.tokens = tokens;
            user.name = userInfo.data.name; // Keep profile updated
            user.picture = userInfo.data.picture;
        }

        await user.save();

        // Set Session
        req.session.userId = user._id;

        // Redirect to Client
        res.redirect(process.env.CLIENT_URL || 'http://localhost:5173');

    } catch (error) {
        console.error('Google Auth Error:', error);
        res.redirect(`${process.env.CLIENT_URL}/login?error=auth_failed`);
    }
});

/**
 * POST /auth/logout
 */
appRouter.post('/logout', (req, res) => {
    req.session = null;
    res.json({ success: true, message: 'Logged out' });
});

/**
 * GET /auth/check
 * Verify session
 */
appRouter.get('/check', async (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ authenticated: false });
    }

    try {
        const user = await User.findById(req.session.userId).select('-tokens'); // Don't send tokens to client
        if (!user) {
            return res.status(401).json({ authenticated: false });
        }
        res.json({ authenticated: true, user });
    } catch (e) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = appRouter;
