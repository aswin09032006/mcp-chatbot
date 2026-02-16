const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const z = require("zod");

// Create an MCP server
const server = new McpServer({
    name: "echo-server",
    version: "1.0.0",
});

// Add a 'ping' tool
server.tool(
    "ping",
    "Responds with pong and the provided message",
    {
        message: z.string().describe("The message to ping back"),
    },
    async ({ message }) => {
        console.error(`[EchoServer] Ping received: ${message}`);
        const resultText = `Pong: ${message}`;
        return {
            content: [
                {
                    type: "text",
                    text: resultText,
                },
            ],
        };
    }
);

async function main() {
    console.error("[EchoServer] Starting up with SDK...");
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("[EchoServer] Ready.");
}

main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
