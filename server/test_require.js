const path = require('path');
try {
    const User = require('./src/models/User');
    console.log('User model loaded successfully');
} catch (e) {
    console.error('Failed to load User model:', e.message);
}

try {
    const githubPath = path.join(__dirname, 'src/mcp/servers/github.js');
    require(githubPath);
    console.log('github.js required successfully');
} catch (e) {
    console.error('Failed to require github.js:', e.message);
}
