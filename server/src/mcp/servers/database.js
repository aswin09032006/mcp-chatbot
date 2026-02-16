const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const path = require("path");
const fs = require("fs");

// Use sqlite3 if available, otherwise mock it for now
let sqlite3;
try {
    sqlite3 = require("sqlite3").verbose();
} catch (e) {
    console.error("sqlite3 not found. Please run 'npm install sqlite3' in the server directory.");
}

const dbPath = path.join(__dirname, "../../../data.sqlite");

const server = new Server(
    {
        name: "database-server",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "query_database",
                description: "Execute a SQL SELECT query on the local SQLite database",
                inputSchema: {
                    type: "object",
                    properties: {
                        sql: { type: "string", description: "The SQL query to execute" },
                    },
                    required: ["sql"],
                },
            },
            {
                name: "list_tables",
                description: "List all tables in the database",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            {
                name: "describe_table",
                description: "Get the schema of a specific table",
                inputSchema: {
                    type: "object",
                    properties: {
                        table: { type: "string" },
                    },
                    required: ["table"],
                },
            }
        ],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (!sqlite3) {
        return {
            content: [{ type: "text", text: "Error: sqlite3 dependency not found. Please install it to use database tools." }],
            isError: true
        };
    }

    const db = new sqlite3.Database(dbPath);

    try {
        switch (name) {
            case "query_database": {
                return new Promise((resolve, reject) => {
                    db.all(args.sql, [], (err, rows) => {
                        if (err) resolve({ content: [{ type: "text", text: `Error: ${err.message}` }], isError: true });
                        else resolve({ content: [{ type: "text", text: JSON.stringify(rows, null, 2) }] });
                        db.close();
                    });
                });
            }
            case "list_tables": {
                return new Promise((resolve, reject) => {
                    db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
                        if (err) resolve({ content: [{ type: "text", text: `Error: ${err.message}` }], isError: true });
                        else resolve({ content: [{ type: "text", text: JSON.stringify(rows.map(r => r.name), null, 2) }] });
                        db.close();
                    });
                });
            }
            case "describe_table": {
                return new Promise((resolve, reject) => {
                    db.all(`PRAGMA table_info(${args.table})`, [], (err, rows) => {
                        if (err) resolve({ content: [{ type: "text", text: `Error: ${err.message}` }], isError: true });
                        else resolve({ content: [{ type: "text", text: JSON.stringify(rows, null, 2) }] });
                        db.close();
                    });
                });
            }
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    } catch (error) {
        db.close();
        return {
            content: [{ type: "text", text: `Database Error: ${error.message}` }],
            isError: true
        };
    }
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Database MCP server running on stdio");
}

main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
