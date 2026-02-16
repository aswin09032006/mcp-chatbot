
const { initMcpClient, callTool, getStatus } = require('./src/services/mcpClient');

async function test() {
    console.log("Initializing MCP Client...");
    try {
        await initMcpClient();
        console.log("MCP Client Initialized.");
    } catch (e) {
        console.error("Init Failed:", e);
        process.exit(1);
    }

    console.log("\n--- Status ---");
    console.log(getStatus());

    console.log("\n--- Calling 'ping' tool on 'echo' server ---");
    try {
        console.log("Sending ping request...");
        const result = await callTool('ping', { message: "Hello MCP!" });
        console.log("Ping Result:", result);
    } catch (e) {
        console.error("Ping Failed:", e.message);
    }

    process.exit(0);
}

test();
