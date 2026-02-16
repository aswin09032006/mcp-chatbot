const { hub } = require('./src/services/mcpClient');

async function test() {
    try {
        console.log('Initializing MCP Hub...');
        await hub.init();
        console.log('Fetching all tools...');
        const tools = await hub.getAllTools();
        console.log('Tools found:', tools.length);
        tools.forEach(t => {
            console.log(`- ${t.function.name} (${t.serverName || 'unknown'})`);
        });
        process.exit(0);
    } catch (e) {
        console.error('Test failed:', e);
        process.exit(1);
    }
}

test();
