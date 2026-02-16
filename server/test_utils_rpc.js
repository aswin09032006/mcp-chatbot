const { spawn } = require('child_process');
const path = require('path');

const serverPath = path.join(__dirname, 'src/mcp/servers/utils.js');
console.log("Spawning server at:", serverPath);
const server = spawn('node', [serverPath], { stdio: ['pipe', 'pipe', 'pipe'] });

let buffer = '';

server.stdout.on('data', (data) => {
    const chunk = data.toString();
    console.log("STDOUT:", chunk);
    buffer += chunk;
    const lines = buffer.split('\n');
    // buffer = lines.pop(); // Wait, this might lose content if JSON spans lines? 
    // Usually JSON-RPC over stdio is one JSON object per line.

    for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        try {
            const msg = JSON.parse(line);
            console.log("Received MSG:", msg);
            if (msg.result) {
                console.log("SUCCESS Result:", JSON.stringify(msg.result, null, 2));
                const fs = require('fs');
                fs.writeFileSync('test_utils_result.json', JSON.stringify(msg.result, null, 2));
                process.exit(0);
            }
            if (msg.error) {
                console.error("ERROR from Server:", msg.error);
                process.exit(1);
            }
        } catch (e) {
            console.error("Parse error for line:", line, e);
        }
    }
    buffer = lines[lines.length - 1];
});

server.stderr.on('data', (data) => console.error(`STDERR: ${data}`));

server.on('error', (err) => {
    console.error("Failed to start server:", err);
});

server.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
});

// JSON-RPC 2.0 Request
const initRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" }
    }
};

setTimeout(() => {
    console.log("Sending Init...");
    server.stdin.write(JSON.stringify(initRequest) + '\n');
}, 500);

// Only send tool call after init response, but for simplicity we rely on sequence or delay
setTimeout(() => {
    const request = {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
            name: "fetch_url",
            arguments: { url: "https://jsonplaceholder.typicode.com/todos/1" }
        }
    };
    console.log("Sending Tool Call...");
    server.stdin.write(JSON.stringify(request) + '\n');
}, 2000);
