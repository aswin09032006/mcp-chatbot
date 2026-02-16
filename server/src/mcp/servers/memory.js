const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");
const { z } = require("zod");
const memoryService = require("../../services/memory");

// Define schemas
const SaveFactSchema = z.object({
    text: z.string().describe("The fact to remember (e.g., 'User likes dark mode')"),
    category: z.string().optional().describe("Category of the fact (e.g., 'preferences', 'relationship')"),
    importance: z.number().min(1).max(5).optional().describe("Importance level (1-5)"),
    userId: z.string().describe("The active user ID")
});

const SearchMemorySchema = z.object({
    query: z.string().describe("The search query"),
    userId: z.string().describe("The active user ID"),
    limit: z.number().optional().describe("Max results to return")
});

const ListFactsSchema = z.object({
    userId: z.string().describe("The active user ID")
});

const DeleteFactSchema = z.object({
    text: z.string().describe("The exact fact text to delete"),
    userId: z.string().describe("The active user ID")
});

class MemoryMcpServer {
    constructor() {
        this.server = new Server(
            {
                name: "creozen-memory",
                version: "1.0.0",
            },
            {
                capabilities: {
                    tools: {},
                },
            }
        );

        this.setupHandlers();
    }

    setupHandlers() {
        // List tools
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: "save_fact",
                        description: "Store a structured fact about the user for long-term memory",
                        inputSchema: {
                            type: "object",
                            properties: {
                                text: { type: "string", description: "The fact to remember" },
                                category: { type: "string", description: "Category of the fact" },
                                importance: { type: "number", description: "1-5 importance" },
                                userId: { type: "string" }
                            },
                            required: ["text"]
                        },
                    },
                    {
                        name: "search_memory",
                        description: "Search both conversation history and extracted facts",
                        inputSchema: {
                            type: "object",
                            properties: {
                                query: { type: "string" },
                                userId: { type: "string" },
                                limit: { type: "number" }
                            },
                            required: ["query"]
                        },
                    },
                    {
                        name: "list_all_facts",
                        description: "Retrieve all stored facts for a user",
                        inputSchema: {
                            type: "object",
                            properties: {
                                userId: { type: "string" }
                            },
                            required: []
                        },
                    },
                    {
                        name: "delete_fact",
                        description: "Remove a fact from long-term memory",
                        inputSchema: {
                            type: "object",
                            properties: {
                                text: { type: "string" },
                                userId: { type: "string" }
                            },
                            required: ["text"]
                        },
                    }
                ],
            };
        });

        // Handle tool calls
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;

            try {
                switch (name) {
                    case "save_fact": {
                        const result = await memoryService.saveFact(args.text, args.category, args.userId, args.importance);
                        return { content: [{ type: "text", text: result.success ? "Fact saved." : `Error: ${result.error}` }] };
                    }
                    case "search_memory": {
                        const results = await memoryService.searchContext(args.query, args.userId, args.limit);
                        return {
                            content: [{
                                type: "text",
                                text: results.length > 0
                                    ? results.map(r => `[${r.type.toUpperCase()}] (${r.category || 'general'}): ${r.text}`).join('\n\n')
                                    : "No relevant memories found."
                            }]
                        };
                    }
                    case "list_all_facts": {
                        const facts = await memoryService.getAllFacts(args.userId);
                        return {
                            content: [{
                                type: "text",
                                text: facts.length > 0
                                    ? facts.map(f => `- [${f.category}]: ${f.text}`).join('\n')
                                    : "No facts stored yet."
                            }]
                        };
                    }
                    case "delete_fact": {
                        const result = await memoryService.deleteFact(args.text, args.userId);
                        return { content: [{ type: "text", text: result.success ? "Fact deleted." : `Error: ${result.error}` }] };
                    }
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            } catch (error) {
                return {
                    content: [{ type: "text", text: `Error: ${error.message}` }],
                    isError: true,
                };
            }
        });
    }

    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error("Memory MCP Server running on stdio");
    }
}

const server = new MemoryMcpServer();
server.run().catch(console.error);
