const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    role: {
        type: String,
        required: true,
        enum: ['user', 'assistant', 'system', 'tool']
    },
    content: {
        type: String,
        default: ''
    },
    tool_calls: [{
        id: String,
        type: { type: String },
        function: {
            name: String,
            arguments: String
        }
    }],
    tool_call_id: String, // For role: 'tool' messages
    name: String, // For role: 'tool' messages
    attachments: [{
        filename: String,
        type: { type: String },
        text: String // Storing extracted text for context reconstruction if needed
    }],
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const chatSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        default: 'New Chat'
    },
    messages: [messageSchema],
    lastMessageAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound indexes for efficient queries
chatSchema.index({ userId: 1, lastMessageAt: -1 }); // For fetching recent chats
chatSchema.index({ userId: 1, createdAt: -1 }); // For fetching chats by creation date

module.exports = mongoose.model('Chat', chatSchema);
