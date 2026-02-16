// mock_notification_server.js
setInterval(() => {
    const notification = {
        jsonrpc: "2.0",
        method: "notifications/test",
        params: { message: "Hello" }
    };
    process.stdout.write(JSON.stringify(notification) + "\n");
}, 1000);

// Keep alive
process.stdin.resume();
