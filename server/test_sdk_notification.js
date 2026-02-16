// test_sdk_notification.js
const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");

async function main() {
    console.log("Starting test...");

    const transport = new StdioClientTransport({
        command: "node",
        args: ["mock_notification_server.js"]
    });

    const client = new Client(
        { name: "test", version: "1.0.0" },
        { capabilities: {} }
    );

    // Try multiple ways to hook notification
    client.fallbackNotificationHandler = (notification) => {
        console.log("fallbackNotificationHandler received:", notification);
    };

    // Also try setting notification handler if method exists
    if (client.setNotificationHandler) {
        console.log("Setting generic notification handler via setNotificationHandler");
        // Usually takes method and handler, but maybe there's a wildcard?
    }

    // Hook transport message for low-level debug
    const originalOnMessage = transport.onmessage;
    // Transport doesn't expose onmessage easily usually, it's internal to connect.

    console.log("Connecting...");
    await client.connect(transport);
    console.log("Connected. Waiting for notifications...");
}

main().catch(console.error);
