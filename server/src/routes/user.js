const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Middleware: Require Auth
const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

/**
 * GET /api/me
 * Get current user profile
 */
router.get('/me', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId).select('-tokens'); // Exclude sensitive tokens
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Get User Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * PUT /api/user/github-token
 * Update user's GitHub PAT
 */
router.put('/github-token', requireAuth, async (req, res) => {
    try {
        const { token } = req.body;
        const user = await User.findByIdAndUpdate(
            req.session.userId,
            { githubToken: token },
            { new: true }
        ).select('-tokens');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ success: true, user });
    } catch (error) {
        console.error('Update GitHub Token Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
