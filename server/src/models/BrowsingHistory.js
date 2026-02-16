const mongoose = require('mongoose');

const browsingHistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    url: {
        type: String,
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true
    },
    extractedContent: {
        type: String,
        required: false
    },
    excerpt: {
        type: String,
        maxlength: 500
    },
    chatId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat',
        index: true
    },
    metadata: {
        byline: String,          // Author
        siteName: String,        // Website name
        publishedTime: Date,     // Publish date
        wordCount: Number,       // Article length
        headings: [{
            level: Number,
            text: String
        }]
    },
    visitedAt: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});

// Compound index for efficient queries
browsingHistorySchema.index({ userId: 1, visitedAt: -1 });
browsingHistorySchema.index({ userId: 1, url: 1 });

// TTL index to automatically delete old history after 90 days
browsingHistorySchema.index({ visitedAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

const BrowsingHistory = mongoose.model('BrowsingHistory', browsingHistorySchema);

module.exports = BrowsingHistory;
