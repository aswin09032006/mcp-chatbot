const mongoose = require('mongoose');

const taskHistorySchema = new mongoose.Schema({
    taskId: {
        type: String,
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    instruction: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['success', 'error'],
        required: true
    },
    result: {
        type: String
    },
    error: {
        type: String
    },
    duration: {
        type: Number // milliseconds
    },
    executedAt: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});

// Compound index for efficient queries
taskHistorySchema.index({ userId: 1, executedAt: -1 });
taskHistorySchema.index({ taskId: 1, executedAt: -1 });

module.exports = mongoose.model('TaskHistory', taskHistorySchema);
