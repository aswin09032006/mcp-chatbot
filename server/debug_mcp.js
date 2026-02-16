const path = require("path");
const fs = require("fs");
const { hub } = require('./src/services/mcpClient');

async function debug() {
    console.log('--- MCP Debug Start ---');
    const configPath = path.join(__dirname, "src/mcp_config.json");
    console.log('Config Path:', configPath);

    if (!fs.existsSync(configPath)) {
        console.error('Config not found!');
        return;
    }

    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    console.log('Servers in config:', Object.keys(config.servers));

    for (const name of Object.keys(config.servers)) {
        try {
            console.log(`Connecting to ${name}...`);
            // We use the hub's internal logic manually to see where it fails
            const serverConfig = config.servers[name];
            let scriptPath = serverConfig.args[0];
            if (!path.isAbsolute(scriptPath)) {
                scriptPath = path.join(__dirname, scriptPath);
            }
            console.log(`  Path: ${scriptPath}`);
            if (!fs.existsSync(scriptPath)) {
                console.error(`  ERROR: Script file does not exist at ${scriptPath}`);
                continue;
            }

            // Optional: try to require it to check for syntax/module errors
            try {
                // Some MCP servers might have top-level code that starts a server,
                // so requiring might actually try to start it.
                // But let's try a dry run of just the require.
                console.log(`  Checking require for ${name}...`);
                // require(scriptPath); 
                // console.log(`  Require success for ${name}`);
            } catch (e) {
                console.error(`  Require FAILED for ${name}:`, e.message);
            }
        } catch (e) {
            console.error(`  Init FAILED for ${name}:`, e.message);
        }
    }

    console.log('--- Full Hub Init ---');
    await hub.init();
    console.log('Connections mapped:', Array.from(hub.connections.keys()));

    const tools = await hub.getAllTools();
    console.log('Tools Found:', tools.length);
    tools.forEach(t => console.log(`- ${t.function.name}`));

    console.log('--- MCP Debug End ---');
    process.exit(0);
}

debug().catch(e => {
    console.error('DEBUG FATAL:', e);
    process.exit(1);
});
