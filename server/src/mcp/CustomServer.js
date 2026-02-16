const EventEmitter = require('events');
const readline = require('readline');

/**
 * Custom MCP Server Implementation (JSON-RPC 2.0 over Stdio)
 * Removes dependency on @modelcontextprotocol/sdk
 */
class CustomMcpServer extends EventEmitter {
    constructor(config) {
        super();
        this.name = config.name;
        this.version = config.version;
        this.tools = new Map();
        this.capabilities = {
            tools: {}
        };
    }

    /**
     * Register a tool
     * @param {string} name - Tool name
     * @param {string} description - Tool description
     * @param {object} inputSchema - JSON Schema for arguments (Zod schema should be converted to JSON first if passed)
     * @param {function} handler - Async function to execute
     */
    tool(name, description, inputSchema, handler) {
        // Support Zod schemas by converting them if they have a 'parse' method, 
        // essentially treating them as black boxes for validation in the handler, 
        // but we need a JSON schema for the client.
        // For simplicity in this custom implementation, we expect inputSchema to be a JSON Schema object 
        // OR a Zod schema object which we might need to describe.
        // However, 'zod-to-json-schema' is a dependency we might want to avoid if being strict.
        // Let's assume the user passes a Zod schema and we use it for validation, 
        // but for the 'list' capability we might provide a simplified schema or expect the user to pass a JSON schema.

        // HACK: To keep it compatible with existing code which passes Zod objects,
        // we will wrap the Zod object. The actual 'list' response might be ugly if we don't convert.
        // But the Groq API expects a JSON schema.
        // Custom decision: We will require the inputSchema to be a Zod object (since we use it for validation)
        // and we will try to infer a basic JSON schema or just pass a placeholder if conversion is too complex without libs.

        // Actually, let's keep it simple: We store the Zod schema for running, 
        // and for listing tools we will return a generic "object" schema if we can't convert.
        // This is a trade-off for zero-dependencies.

        this.tools.set(name, {
            name,
            description,
            inputSchema, // This is Zod object in current codebase
            handler
        });
    }

    /**
     * Start listening on Stdio
     */
    async connect(transport) {
        // We ignore the transport arg as we enforce Stdio
        console.error(`[${this.name}] Starting Custom MCP Server on Stdio...`);

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: false
        });

        rl.on('line', async (line) => {
            if (!line.trim()) return;
            try {
                const message = JSON.parse(line);
                await this.handleMessage(message);
            } catch (error) {
                console.error("Failed to parse message:", error);
                this.sendError(null, -32700, "Parse error");
            }
        });
    }

    /**
     * Handle incoming JSON-RPC message
     */
    async handleMessage(message) {
        const { jsonrpc, id, method, params } = message;

        if (jsonrpc !== '2.0') {
            return this.sendError(id, -32600, "Invalid Request");
        }

        try {
            switch (method) {
                case 'initialize':
                    return this.sendResult(id, {
                        protocolVersion: '2024-11-05',
                        capabilities: this.capabilities,
                        serverInfo: {
                            name: this.name,
                            version: this.version
                        }
                    });

                case 'notifications/initialized':
                    // Client confirming initialization
                    return; // No response needed for notification

                case 'ping':
                    return this.sendResult(id, {});

                case 'tools/list':
                    const toolList = Array.from(this.tools.values()).map(t => {
                        const properties = {};
                        const required = [];

                        // Basic extraction of properties from Zod-like object if possible
                        if (t.inputSchema && typeof t.inputSchema === 'object') {
                            // Check if it's a Zod object
                            const shape = t.inputSchema._def?.shape?.() || t.inputSchema.shape || t.inputSchema;

                            if (typeof shape === 'object' && shape !== null) {
                                Object.entries(shape).forEach(([key, value]) => {
                                    properties[key] = {
                                        type: "string", // Default to string for simplicity
                                        description: value._def?.description || `The ${key} parameter`
                                    };

                                    // Zod-specific checks for required status
                                    const isOptional = value._def?.typeName === 'ZodOptional' || value.isOptional;
                                    const hasDefault = value._def?.defaultValue !== undefined;

                                    if (!isOptional && !hasDefault) {
                                        required.push(key);
                                    }
                                });
                            }
                        }

                        return {
                            name: t.name,
                            description: t.description,
                            inputSchema: {
                                type: "object",
                                properties,
                                required: required.length > 0 ? required : undefined
                            }
                        };
                    });
                    return this.sendResult(id, { tools: toolList });

                case 'tools/call':
                    const { name, arguments: args } = params;
                    const tool = this.tools.get(name);

                    if (!tool) {
                        return this.sendError(id, -32601, `Tool not found: ${name}`);
                    }

                    // Execute handler
                    try {
                        const result = await tool.handler(args);
                        // Result should be { content: [{ type: "text", text: "..." }] }
                        return this.sendResult(id, result);
                    } catch (err) {
                        return this.sendResult(id, {
                            isError: true,
                            content: [{ type: "text", text: `Error: ${err.message}` }]
                        });
                    }

                default:
                    return this.sendError(id, -32601, `Method not found: ${method}`);
            }
        } catch (error) {
            console.error(`Internal error handling ${method}:`, error);
            return this.sendError(id, -32603, "Internal error");
        }
    }

    sendResult(id, result) {
        if (id === undefined || id === null) return; // Notifications don't get responses
        const response = {
            jsonrpc: "2.0",
            id,
            result
        };
        process.stdout.write(JSON.stringify(response) + "\n");
    }

    sendError(id, code, message) {
        if (id === undefined || id === null) return;
        const response = {
            jsonrpc: "2.0",
            id,
            error: { code, message }
        };
        process.stdout.write(JSON.stringify(response) + "\n");
    }
}

module.exports = { CustomMcpServer };
