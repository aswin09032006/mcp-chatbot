const express = require('express');
const router = express.Router();
const memoryService = require('../services/memory');

// Get memory statistics
router.get('/stats', async (req, res) => {
    try {
        if (!memoryService.initialized) await memoryService.init();

        let count = 0;
        if (memoryService.messageTable) {
            count = await memoryService.messageTable.countRows();
        }

        res.json({
            success: true,
            totalMemories: count,
            status: memoryService.initialized ? 'active' : 'inactive'
        });
    } catch (error) {
        console.error('Memory stats error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch memory stats' });
    }
});

// Get all facts for a user
router.get('/facts/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const facts = await memoryService.getAllFacts(userId);
        res.json({ success: true, facts });
    } catch (error) {
        console.error('Fetch facts error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch facts' });
    }
});

// Delete a fact
router.delete('/facts', async (req, res) => {
    try {
        const { text, userId } = req.body;
        const result = await memoryService.deleteFact(text, userId);
        res.json(result);
    } catch (error) {
        console.error('Delete fact error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete fact' });
    }
});

// Test memory recall
router.post('/query', async (req, res) => {
    try {
        const { query, userId } = req.body;
        if (!query) return res.status(400).json({ success: false, error: 'Query required' });

        const results = await memoryService.searchContext(query, userId || 'unknown');

        res.json({
            success: true,
            results: results
        });
    } catch (error) {
        console.error('Memory query error:', error);
        res.status(500).json({ success: false, error: 'Failed to query memory' });
    }
});

module.exports = router;
