const { CustomMcpServer } = require("../CustomServer");
const schedule = require('node-schedule');
const fs = require('fs');
const path = require('path');
const z = require("zod");

// Create Server
const server = new CustomMcpServer({
    name: "scheduler-server",
    version: "1.0.0"
});

// Persistence
const DATA_FILE = path.join(__dirname, '../../../scheduler_data.json');
const LOG_FILE = path.join(__dirname, '../../../scheduler.log');

const log = (msg) => {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(LOG_FILE, `[${timestamp}] ${msg}\n`);
};

let tasks = [];

// Load tasks on startup
try {
    if (fs.existsSync(DATA_FILE)) {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        if (data.trim() === '' || data.trim() === '[]') {
            log(`Scheduler data file is empty, starting fresh`);
            tasks = [];
        } else {
            tasks = JSON.parse(data);
            log(`Loaded ${tasks.length} scheduled tasks.`);
        }
    } else {
        log(`No scheduler data file found, creating new one`);
        tasks = [];
        fs.writeFileSync(DATA_FILE, '[]', 'utf8');
    }
} catch (e) {
    log(`Failed to load scheduler data: ${e.message}`);
    log(`Attempting recovery...`);
    // Try to recover from backup or start fresh
    tasks = [];
    try {
        fs.writeFileSync(DATA_FILE, '[]', 'utf8');
        log(`Created fresh scheduler data file`);
    } catch (writeErr) {
        log(`CRITICAL: Cannot write to scheduler data file: ${writeErr.message}`);
    }
}

// Save tasks with atomic write to prevent corruption
const saveTasks = () => {
    try {
        const tempFile = DATA_FILE + '.tmp';
        // Write to temp file first
        fs.writeFileSync(tempFile, JSON.stringify(tasks, null, 2), 'utf8');
        // Atomic rename
        fs.renameSync(tempFile, DATA_FILE);
        log(`Saved ${tasks.length} tasks to disk`);
    } catch (e) {
        console.error("Failed to save scheduler data:", e);
        log(`ERROR saving tasks: ${e.message}`);
    }
};

// Helper: Send Notification
const sendTaskDue = (task) => {
    const notification = {
        jsonrpc: "2.0",
        method: "notifications/task_due",
        params: {
            userId: task.userId,
            instruction: task.instruction,
            taskId: task.id
        }
    };
    process.stdout.write(JSON.stringify(notification) + "\n");
};

// Reschedule all loaded tasks
tasks.forEach(task => {
    if (task.cron) {
        // Recurring task
        schedule.scheduleJob(task.id, task.cron, () => {
            log(`Executing task ${task.id}: ${task.instruction}`);
            console.error(`Executing task ${task.id}: ${task.instruction}`);
            sendTaskDue(task);
        });
    } else if (task.executeAt) {
        // One-time task
        const executeDate = new Date(task.executeAt);

        // Only reschedule if the execution time is still in the future
        if (executeDate > new Date()) {
            schedule.scheduleJob(task.id, executeDate, () => {
                log(`Executing one-time task ${task.id}: ${task.instruction}`);
                console.error(`Executing one-time task ${task.id}: ${task.instruction}`);
                sendTaskDue(task);

                // Remove from tasks list after execution
                const index = tasks.findIndex(t => t.id === task.id);
                if (index !== -1) {
                    tasks.splice(index, 1);
                    saveTasks();
                    log(`Removed completed one-time task ${task.id}`);
                }
            });
            log(`Rescheduled one-time task ${task.id} for ${executeDate.toISOString()}`);
        } else {
            // Task was supposed to run in the past, remove it from memory only
            log(`Removing expired one-time task ${task.id} (was scheduled for ${executeDate.toISOString()})`);
            const index = tasks.findIndex(t => t.id === task.id);
            if (index !== -1) {
                tasks.splice(index, 1);
            }
        }
    }
});

// Helper to format results for MCP
const formatResult = (data) => {
    return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
    };
};

/**
 * Register Scheduler Tools
 */

server.tool("schedule_task", "Schedule a task to run repeatedly using cron syntax. CRITICAL: For 'every minute', use '*/1 * * * *'. For 'every hour', use '0 * * * *'. Do NOT use '0 9 * * *' unless you mean 9 AM daily.",
    {
        userId: z.string().optional(),
        instruction: z.string().describe("What the AI should do (e.g., 'Check emails')"),
        cron: z.string().describe("Cron expression (e.g., '*/1 * * * *' for every minute, '0 9 * * *' for daily at 9am)"),
        chatId: z.string().optional().describe("Chat ID where task was created (for posting results)")
    },
    async (args) => {
        const id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        try {
            // Validate arguments
            const schema = z.object({
                userId: z.string().optional(),
                instruction: z.string().min(1, "Instruction is required"),
                cron: z.string().min(1, "Cron expression is required"),
                chatId: z.string().optional()
            });

            const { userId, instruction, cron, chatId } = schema.parse(args);

            // Validate cron
            if (!schedule.scheduleJob(id, cron, () => sendTaskDue({ userId, instruction, id, chatId }))) {
                throw new Error("Invalid cron expression");
            }

            const task = {
                id,
                userId,
                instruction,
                cron,
                chatId: chatId || null,
                createdAt: new Date().toISOString()
            };
            tasks.push(task);
            saveTasks();

            // Schedule the new task immediately
            schedule.scheduleJob(task.id, task.cron, () => {
                log(`Executing task ${task.id}: ${task.instruction}`);
                console.error(`Executing task ${task.id}: ${task.instruction}`);
                sendTaskDue(task);
            });

            log(`Created new task: ${id} with cron ${cron}`);

            return formatResult({ success: true, task });
        } catch (e) {
            return formatResult({ error: e.message });
        }
    }
);

server.tool("schedule_once", "Schedule a task to run ONCE at a specific date and time. Use this when user says 'at 5pm', 'by 4:50pm', 'tomorrow at 9am', etc.",
    {
        userId: z.string().optional(),
        instruction: z.string().describe("What the AI should do (e.g., 'Send email to aswin@example.com about meeting')"),
        executeAt: z.string().describe("ISO 8601 datetime string when to execute (e.g., '2026-02-15T16:50:00+05:30')"),
        chatId: z.string().optional().describe("Chat ID where task was created (for posting results)")
    },
    async (args) => {
        const id = `once_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        try {
            const schema = z.object({
                userId: z.string().optional(),
                instruction: z.string().min(1, "Instruction is required"),
                executeAt: z.string().min(1, "Execute time is required"),
                chatId: z.string().optional()
            });

            const { userId, instruction, executeAt, chatId } = schema.parse(args);

            // Parse and validate the date
            const executeDate = new Date(executeAt);
            if (isNaN(executeDate.getTime())) {
                throw new Error("Invalid date format. Use ISO 8601 format.");
            }

            // Check if date is in the future
            if (executeDate <= new Date()) {
                throw new Error("Execute time must be in the future");
            }

            const task = {
                id,
                userId,
                instruction,
                executeAt: executeDate.toISOString(),
                type: 'once',
                chatId: chatId || null,
                createdAt: new Date().toISOString()
            };

            tasks.push(task);
            saveTasks();

            // Schedule the one-time job
            schedule.scheduleJob(task.id, executeDate, () => {
                log(`Executing one-time task ${task.id}: ${task.instruction}`);
                console.error(`Executing one-time task ${task.id}: ${task.instruction}`);
                sendTaskDue(task);

                // Remove from tasks list after execution
                const index = tasks.findIndex(t => t.id === task.id);
                if (index !== -1) {
                    tasks.splice(index, 1);
                    saveTasks();
                    log(`Removed completed one-time task ${task.id}`);
                }
            });

            log(`Created one-time task: ${id} scheduled for ${executeDate.toISOString()}`);

            return formatResult({
                success: true,
                task,
                message: `Task scheduled for ${executeDate.toLocaleString()}`
            });
        } catch (e) {
            return formatResult({ error: e.message });
        }
    }
);

server.tool("list_tasks", "List all scheduled tasks (both recurring and one-time)",
    { userId: z.string().optional() },
    async ({ userId }) => {
        const userTasks = tasks.filter(t => t.userId === userId);
        return formatResult(userTasks);
    }
);

server.tool("delete_task", "Delete a scheduled task",
    { userId: z.string().optional(), taskId: z.string() },
    async ({ userId, taskId }) => {
        const index = tasks.findIndex(t => t.id === taskId && t.userId === userId);
        if (index === -1) {
            return formatResult({ error: "Task not found" });
        }

        const task = tasks[index];
        const job = schedule.scheduledJobs[taskId];
        if (job) job.cancel();

        tasks.splice(index, 1);
        saveTasks();

        return formatResult({ success: true, message: "Task deleted" });
    }
);

// Start Server
async function main() {
    console.error("Scheduler MCP Server running on stdio");
    await server.connect();
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
