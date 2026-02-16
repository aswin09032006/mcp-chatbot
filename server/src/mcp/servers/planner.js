const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");
const { z } = require("zod");

class PlannerMcpServer {
    constructor() {
        this.server = new Server(
            {
                name: "creozen-planner",
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
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: "plan_task",
                        description: "Break down a complex user request into a step-by-step execution plan. Use this before executing multiple tool calls to ensure accuracy.",
                        inputSchema: {
                            type: "object",
                            properties: {
                                goal: {
                                    type: "string",
                                    description: "The main objective to achieve."
                                },
                                steps: {
                                    type: "array",
                                    items: { type: "string" },
                                    description: "A list of logical steps to reach the goal."
                                },
                                requirements: {
                                    type: "array",
                                    items: { type: "string" },
                                    description: "Any specific constraints or information needed."
                                }
                            },
                            required: ["goal", "steps"]
                        },
                    }
                ],
            };
        });

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;

            try {
                switch (name) {
                    case "plan_task": {
                        const planMarkdown = `### 📋 Execution Plan: ${args.goal}\n\n` +
                            args.steps.map((s, i) => `${i + 1}. ${s}`).join('\n') +
                            (args.requirements ? `\n\n**Requirements:**\n` + args.requirements.map(r => `- ${r}`).join('\n') : '');

                        return {
                            content: [{
                                type: "text",
                                text: planMarkdown
                            }],
                            // This tool serves as a "commitment" to a plan, the AI will use this output to guide its next steps.
                            metadata: { is_planning_step: true }
                        };
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
        console.error("Planner MCP Server running on stdio");
    }
}

const server = new PlannerMcpServer();
server.run().catch(console.error);
