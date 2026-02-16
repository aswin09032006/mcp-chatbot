const express = require('express');
const dotenv = require('dotenv');
dotenv.config(); // Load env vars immediately

const cors = require('cors');
const mongoose = require('mongoose');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const cookieSession = require('cookie-session');
const path = require('path');
const { initMcpClient, getStatus, hub } = require('./services/mcpClient'); // Import hub
const chatService = require('./services/chat'); // Import chat service
const memoryService = require('./services/memory'); // Import memory service
const User = require('./models/User'); // Import User model to verify user exists

dotenv.config();

// Fail-fast on missing critical env vars
if (!process.env.SESSION_SECRET) {
    console.error('FATAL: SESSION_SECRET is not defined.');
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disabled for dev simplicity, enable in prod
    crossOriginEmbedderPolicy: false
}));

// Rate Limiting
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200, // Increased for dev
    standardHeaders: true,
    legacyHeaders: false,
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/auth/', authLimiter);
app.use('/api/', apiLimiter);

// General Middleware
app.use(express.json());
app.use(compression());
app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true
}));

app.use(cookieSession({
    name: 'session',
    keys: [process.env.SESSION_SECRET],
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
}));

// Routes
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const uploadRoutes = require('./routes/upload');
const userRoutes = require('./routes/user');
const memoryRoutes = require('./routes/memory');
const tasksRoutes = require('./routes/tasks');

app.use('/auth', authRoutes);
app.use('/api/chat', chatRoutes); // Semantic singular for POST /
app.use('/api/chats', chatRoutes); // Plural for GET list/DELETE
app.use('/api/upload', uploadRoutes);
app.use('/api/memory', memoryRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/user', userRoutes);

// MCP Status Endpoint
app.get('/api/mcp/status', apiLimiter, (req, res) => {
    res.json(getStatus());
});

// Helper: Get or create "Scheduled Tasks" chat for a user
const Chat = require('./models/Chat');
const getOrCreateTasksChat = async (userId) => {
    try {
        // Find existing "Scheduled Tasks" chat
        let chat = await Chat.findOne({
            userId,
            title: 'Scheduled Tasks'
        });

        if (!chat) {
            // Create new chat
            chat = new Chat({
                userId,
                title: 'Scheduled Tasks',
                messages: [{
                    role: 'system',
                    content: 'This chat displays results from your scheduled tasks. Each task execution will appear here automatically.',
                    timestamp: new Date()
                }],
                lastMessageAt: new Date()
            });
            await chat.save();
            console.log(`[Autonomous] Created "Scheduled Tasks" chat for user ${userId}`);
        }

        return chat._id;
    } catch (error) {
        console.error('[Autonomous] Failed to get/create tasks chat:', error);
        return null;
    }
};


// Database Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('MongoDB connected successfully');

        // Initialize MCP Client & Memory Service
        Promise.all([
            initMcpClient().catch(err => console.error("MCP Init Failed:", err)),
            memoryService.init().catch(err => console.error("Memory Init Failed:", err))
        ]);

        // Start Server only after DB is ready
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error("MongoDB Connection Failed:", err);
        process.exit(1);
    });

// --- Autonomous Task Handling ---
hub.on('notification', async (notification) => {
    if (notification.method === 'notifications/task_due') {
        const { userId, instruction, taskId, chatId } = notification.params;
        console.log(`[Autonomous] Task Due: "${instruction}" for User ${userId}` + (chatId ? ` in chat ${chatId}` : ''));

        try {
            // Verify user exists and is valid
            const user = await User.findById(userId);
            if (!user) {
                console.warn(`[Autonomous] User ${userId} not found, skipping task.`);
                return;
            }

            if (!instruction) {
                console.warn(`[Autonomous] Task ${taskId} has no instruction, skipping.`);
                return;
            }

            const startTime = Date.now();
            let taskStatus = 'success';
            let taskError = null;
            let taskResult = null;

            try {
                // Construct message with strict tool restrictions
                const messages = [{
                    role: 'system',
                    content: `You are executing a scheduled task: "${instruction}".

CRITICAL RESTRICTIONS:
- DO NOT use schedule_task, list_tasks, or delete_task tools
- DO NOT create, modify, or delete scheduled tasks
- ONLY perform the requested action using read-only tools
- Be direct and concise

Perform the task now.`
                }, {
                    role: 'user',
                    content: instruction
                }];

                const result = await chatService.chat(userId, messages);
                taskResult = result.content.substring(0, 500);
                console.log(`[Autonomous] Task Executed. Result: ${result.content.substring(0, 50)}...`);
            } catch (execError) {
                taskStatus = 'error';
                taskError = execError.message;
                throw execError;
            } finally {
                // Save to history
                const duration = Date.now() - startTime;
                const TaskHistory = require('./models/TaskHistory');

                await TaskHistory.create({
                    taskId, userId, instruction,
                    status: taskStatus,
                    result: taskResult,
                    error: taskError,
                    duration,
                    executedAt: new Date()
                }).catch(err => console.error('[Autonomous] Failed to save history:', err));

                // Post result to original chat if chatId is provided, otherwise use dedicated tasks chat
                let targetChatId = chatId;
                if (!targetChatId) {
                    targetChatId = await getOrCreateTasksChat(userId);
                    console.log(`[Autonomous] No chatId provided, using Scheduled Tasks chat: ${targetChatId}`);
                }

                if (targetChatId) {
                    try {
                        const chat = await Chat.findById(targetChatId);
                        if (chat) {
                            const statusEmoji = taskStatus === 'success' ? '✅' : '❌';
                            const timestamp = new Date().toLocaleString();
                            let messageContent = `${statusEmoji} **Scheduled Task Result** (${timestamp})\n\n**Task:** ${instruction}\n**Duration:** ${(duration / 1000).toFixed(2)}s\n\n`;

                            if (taskStatus === 'success' && taskResult) {
                                messageContent += `**Result:**\n${taskResult}`;
                            } else if (taskError) {
                                messageContent += `**Error:**\n${taskError}`;
                            }

                            chat.messages.push({
                                role: 'assistant',
                                content: messageContent,
                                timestamp: new Date()
                            });
                            chat.lastMessageAt = new Date();
                            await chat.save();
                            console.log(`[Autonomous] Posted result to chat ${targetChatId}`);
                        } else {
                            console.warn(`[Autonomous] Chat ${targetChatId} not found`);
                        }
                    } catch (chatError) {
                        console.error('[Autonomous] Failed to post to chat:', chatError);
                    }
                } else {
                    console.error(`[Autonomous] Failed to get or create chat for task results`);
                }
            }

        } catch (error) {
            if (error.status === 429 || error.code === 'rate_limit_exceeded') {
                console.warn(`[Autonomous] Rate Limit Exceeded for task ${taskId}. Skipping execution.`);
            } else {
                console.error(`[Autonomous] Execution Failed:`, error);
            }
        }
    }
});
