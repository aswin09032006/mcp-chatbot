const express = require('express');
const router = express.Router();
const chatService = require('../services/chat');
const mcpClient = require('../services/mcpClient');
const Chat = require('../models/Chat');
const User = require('../models/User');

// Middleware: Require Auth
const requireAuth = async (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

/**
 * GET /api/chats
 * List user chats
 */
router.get('/', requireAuth, async (req, res) => {
    try {
        const chats = await Chat.find({ userId: req.session.userId })
            .sort({ lastMessageAt: -1 })
            .select('title lastMessageAt createdAt');
        res.json(chats);
    } catch (error) {
        console.error('List Chats Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * GET /api/chats/:id
 * Get specific chat
 */
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const chat = await Chat.findOne({
            _id: req.params.id,
            userId: req.session.userId
        });

        if (!chat) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        // Filter out tool and system messages - only show user and assistant messages
        // Also strip tool_calls from assistant messages if we are filtering tool results
        const filteredMessages = chat.messages
            .filter(msg => msg.role === 'user' || msg.role === 'assistant')
            .map(msg => {
                const m = msg.toObject();
                if (m.role === 'assistant') {
                    delete m.tool_calls;
                }
                return m;
            });

        const filteredChat = {
            ...chat.toObject(),
            messages: filteredMessages
        };

        res.json(filteredChat);
    } catch (error) {
        console.error('Get Chat Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * DELETE /api/chats/:id
 * Delete specific chat
 */
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const result = await Chat.deleteOne({
            _id: req.params.id,
            userId: req.session.userId
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        res.json({ success: true, message: 'Chat deleted' });
    } catch (error) {
        console.error('Delete Chat Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * POST /api/chat
 * Send a message to the chatbot
 */
router.post('/', requireAuth, async (req, res) => {
    let { messages, history, model, attachments, chatId } = req.body;
    const userId = req.session.userId;

    // Support 'history' as alias for 'messages' (Frontend sends 'history')
    if (!messages && history) {
        messages = history;
    }

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Messages array is required' });
    }

    try {
        // Use streaming chat service
        // Note: chatStream handles the response (res) directly via SSE
        // Use streaming chat service
        // Note: chatStream handles the response (res) directly via SSE
        await chatService.chatStream(userId, messages, model, attachments, res, chatId);
    } catch (error) {
        console.error('Chat Error:', error);
        // If headers weren't sent, we can send a JSON error
        if (!res.headersSent) {
            res.status(500).json({
                error: 'Failed to generate response',
                details: error.message
            });
        } else {
            // If stream started, we might have already sent an error event in chatStream
            res.end();
        }
    }
});

/**
 * POST /api/tools/reload
 * Reload MCP tools
 */
router.post('/tools/reload', requireAuth, async (req, res) => {
    try {
        const count = await mcpClient.reloadTools();
        res.json({ success: true, count });
    } catch (error) {
        console.error('Reload Tools Error:', error);
        res.status(500).json({ error: 'Failed to reload tools' });
    }
});

module.exports = router;
