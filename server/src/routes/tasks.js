const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const TaskHistory = require('../models/TaskHistory');

// Middleware: Require Auth
const requireAuth = async (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

const SCHEDULER_DATA_PATH = path.join(__dirname, '../../scheduler_data.json');

/**
 * GET /api/tasks
 * List active scheduled tasks
 */
router.get('/', requireAuth, async (req, res) => {
    try {
        const data = await fs.readFile(SCHEDULER_DATA_PATH, 'utf-8');
        const tasks = JSON.parse(data);

        // Filter tasks for current user
        const userTasks = tasks.filter(t => t.userId === req.session.userId);

        res.json(userTasks);
    } catch (error) {
        console.error('List Tasks Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * GET /api/tasks/history
 * Get task execution history
 */
router.get('/history', requireAuth, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const taskId = req.query.taskId;

        const query = { userId: req.session.userId };
        if (taskId) {
            query.taskId = taskId;
        }

        const history = await TaskHistory.find(query)
            .sort({ executedAt: -1 })
            .limit(limit);

        res.json(history);
    } catch (error) {
        console.error('Get History Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * DELETE /api/tasks/:id
 * Delete a scheduled task
 */
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const taskId = req.params.id;

        const data = await fs.readFile(SCHEDULER_DATA_PATH, 'utf-8');
        const tasks = JSON.parse(data);

        // Find task and verify ownership
        const taskIndex = tasks.findIndex(t => t.id === taskId && t.userId === req.session.userId);

        if (taskIndex === -1) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // Remove task
        tasks.splice(taskIndex, 1);

        // Save updated tasks
        await fs.writeFile(SCHEDULER_DATA_PATH, JSON.stringify(tasks, null, 2));

        res.json({ success: true, message: 'Task deleted' });
    } catch (error) {
        console.error('Delete Task Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
