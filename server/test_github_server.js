const { spawn } = require('child_process');
const path = require('path');

const scriptPath = path.join(__dirname, 'src/mcp/servers/github.js');

console.log('Testing github.js...');
const child = spawn('node', [scriptPath], {
    env: { ...process.env, MONGODB_URI: 'mongodb://localhost:27017/mcp-chatbot' },
    stdio: ['pipe', 'pipe', 'pipe']
});

child.stdout.on('data', (data) => {
    console.log('STDOUT:', data.toString());
});

child.stderr.on('data', (data) => {
    console.error('STDERR:', data.toString());
});

setTimeout(() => {
    console.log('Killing child process...');
    child.kill();
    process.exit(0);
}, 2000);
