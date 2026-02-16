const express = require('express');
const router = express.Router();
const { saveVisit, getRecentPages, searchHistory, getChatHistory } = require('../services/historyService');

/**
 * Browsing History API Routes
 * Handles saving, retrieving, and searching browsing history
 */

// Save a visited page to history
router.post('/', async (req, res) => {
    try {
        const userId = req.user._id;
        const { url, title, content, excerpt, chatId, metadata } = req.body;

        if (!url || !title) {
            return res.status(400).json({
                success: false,
                error: 'URL and title are required'
            });
        }

        const entry = await saveVisit(userId, {
            url,
            title,
            content,
            excerpt,
            chatId,
            metadata
        });

        res.json({
            success: true,
            entry: {
                id: entry._id,
                url: entry.url,
                title: entry.title,
                visitedAt: entry.visitedAt
            }
        });
    } catch (error) {
        console.error('Error saving browsing history:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get recent browsing history
router.get('/', async (req, res) => {
    try {
        const userId = req.user._id;
        const limit = parseInt(req.query.limit) || 10;

        const pages = await getRecentPages(userId, limit);

        res.json({
            success: true,
            pages,
            count: pages.length
        });
    } catch (error) {
        console.error('Error fetching browsing history:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Search browsing history
router.get('/search', async (req, res) => {
    try {
        const userId = req.user._id;
        const query = req.query.q;

        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'Search query is required'
            });
        }

        const pages = await searchHistory(userId, query);

        res.json({
            success: true,
            pages,
            count: pages.length,
            query
        });
    } catch (error) {
        console.error('Error searching browsing history:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get browsing history for a specific chat
router.get('/chat/:chatId', async (req, res) => {
    try {
        const userId = req.user._id;
        const { chatId } = req.params;

        const pages = await getChatHistory(userId, chatId);

        res.json({
            success: true,
            pages,
            count: pages.length,
            chatId
        });
    } catch (error) {
        console.error('Error fetching chat history:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
