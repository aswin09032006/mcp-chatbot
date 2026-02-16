const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config();

// Fix paths since we are in server/ root
const { initMcpClient } = require('./src/services/mcpClient');
// We need to require chat service. 
// Note: chat service might use models that need DB connection.
const chatService = require('./src/services/chat');

const fs = require('fs');

function log(msg) {
    console.log(msg);
    fs.appendFileSync('test_result.txt', msg + '\n');
}

async function test() {
    try {
        log("Connecting to DB...");
        await mongoose.connect(process.env.MONGODB_URI);
        log("DB Connected");

        log("Initializing MCP Client...");
        await initMcpClient();
        log("MCP Client Initialized");

        // Mock User ID
        const userId = "698b2c259f503feab3bc4b4b"; // Use the one from scheduler_data.json if valid, or random

        log("Sending chat message...");
        const messages = [{ role: 'user', content: "Schedule a task to echo 'ANTIGRAVITY_TEST_UNIQUE_ID' every minute" }];

        // We use the non-streaming chat function for simplicity in testing if available, 
        // but chat.js exports { chat, chatStream }. The 'chat' function returns a promise with content.
        const response = await chatService.chat(userId, messages);

        log("\n--- Response ---");
        log(response.content);
        log("\n--- Trace ---");
        response.trace.forEach(t => {
            if (t.type === 'tool_start') log(`[Tool Call] ${t.name} args: ${t.args}`);
            if (t.type === 'tool_end') log(`[Tool Result] ${t.name}: ${t.result}`);
            if (t.type === 'tool_error') log(`[Tool Error] ${t.name}: ${t.error}`);
        });

    } catch (error) {
        log("Test Failed: " + error);
        console.error(error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

test();
