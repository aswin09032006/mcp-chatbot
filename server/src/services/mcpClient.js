const path = require("path");
const fs = require("fs");
const EventEmitter = require('events');
const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");

class McpHub extends EventEmitter {
    constructor() {
        super();
        this.connections = new Map(); // serverName -> { client, transport }
    }

    async init() {
        if (this.connections.size > 0) return;

        const configPath = path.join(__dirname, "../../mcp_config.json");
        if (!fs.existsSync(configPath)) {
            console.error("mcp_config.json not found!");
            return;
        }

        const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

        const promises = Object.entries(config.servers).map(async ([name, serverConfig]) => {
            try {
                console.log(`[MCP Hub] Connecting to server: ${name}...`);

                // Resolve script path
                let scriptPath = serverConfig.args[0];
                if (!path.isAbsolute(scriptPath)) {
                    scriptPath = path.join(__dirname, '../../', scriptPath);
                }

                const command = serverConfig.command;
                const args = [scriptPath, ...(serverConfig.args.slice(1) || [])];

                const transport = new StdioClientTransport({
                    command: command,
                    args: args,
                });

                const client = new Client(
                    {
                        name: "mcp-chatbot-host",
                        version: "1.0.0",
                    },
                    {
                        capabilities: {
                            sampling: {},
                        },
                    }
                );

                // Register a fallback handler to forward all notifications to the Hub
                client.fallbackNotificationHandler = (notification) => {
                    // Forward notification to Hub subscribers
                    this.emit('notification', {
                        method: notification.method,
                        params: notification.params
                    });
                };

                await client.connect(transport);
                this.connections.set(name, { client, transport });
                console.log(`[MCP Hub] Connected to ${name}`);
            } catch (e) {
                console.error(`[MCP Hub] Failed to connect to ${name}:`, e);
            }
        });

        await Promise.all(promises);
    }

    async getAllTools() {
        await this.init();
        let allTools = [];

        for (const [serverName, { client }] of this.connections.entries()) {
            try {
                const result = await client.listTools();
                const serverTools = result.tools.map((t) => ({
                    ...t,
                    serverName, // Internal tag for routing
                }));
                allTools = allTools.concat(serverTools);
            } catch (e) {
                console.error(`[MCP Hub] Failed to list tools for ${serverName}:`, e);
            }
        }

        // Convert to OpenAI format
        return allTools.map((tool) => ({
            type: "function",
            function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.inputSchema,
            },
        }));
    }

    async callTool(name, args) {
        await this.init();

        // Find which server has this tool
        let targetClient = null;
        let targetServerName = null;

        for (const [serverName, { client }] of this.connections.entries()) {
            const result = await client.listTools();
            if (result.tools.find(t => t.name === name)) {
                targetClient = client;
                targetServerName = serverName;
                break;
            }
        }

        if (!targetClient) {
            throw new Error(`Tool ${name} not found on any active MCP server`);
        }

        console.log(`[MCP Hub] Routing ${name} to ${targetServerName}`);

        const result = await targetClient.callTool({
            name,
            arguments: args,
        });

        // Parse result content
        const textContent = result.content
            .filter(c => c.type === 'text')
            .map(c => c.text)
            .join('\n');

        try {
            // Try to parse as JSON if it looks like JSON, essentially unwrapping
            return JSON.parse(textContent);
        } catch (e) {
            // Otherwise return object with output field
            return { output: textContent };
        }
    }

    getStatus() {
        const status = {};
        for (const [name, { client }] of this.connections.entries()) {
            // SDK client doesn't expose a simple 'connected' boolean property directly 
            // in the same way, but if it didn't throw during connect, it's likely ok. 
            // We can check transport status if needed, but for now assume online if in map.
            status[name] = "online";
        }
        return {
            hub: "active",
            transport: "multi-server-hub-sdk",
            servers: status,
        };
    }
}

const hub = new McpHub();

module.exports = {
    hub,
    initMcpClient: () => hub.init(),
    getTools: () => hub.getAllTools(),
    callTool: (name, args) => hub.callTool(name, args),
    getStatus: () => hub.getStatus(),
    // reloadTools: () => hub.reload() // Reload logic would need to act on transports
};
