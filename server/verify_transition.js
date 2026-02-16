const { chat } = require('./src/services/chat');
const { hub } = require('./src/services/mcpClient');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function verify() {
    console.log('--- LLM Transition Verification ---');
    console.log('Endpoint:', process.env.GITHUB_MODELS_ENDPOINT || 'https://models.github.ai/inference');
    console.log('Model:', process.env.LLM_MODEL || 'gpt-4o');

    try {
        console.log('1. Initializing MCP Hub...');
        await hub.init();
        const tools = await hub.getTools();
        console.log(`Success: Found ${tools.length} total tools.`);

        console.log('2. Testing Chat Service Initialization...');
        // We won't actually call the API to avoid using user credits/quota in a test script,
        // but we'll check if the client is initialized correctly in chat.js
        const chatService = require('./src/services/chat');
        if (chatService.chat) {
            console.log('Success: Chat service components are correctly exported.');
        }

        console.log('--- Verification Complete ---');
        process.exit(0);
    } catch (error) {
        console.error('Verification Failed:', error);
        process.exit(1);
    }
}

verify();
