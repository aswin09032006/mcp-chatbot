const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const z = require("zod");
const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");

// Load environment variables from the root server .env
dotenv.config({ path: path.join(__dirname, "../../../.env") });

// Import existing services
const { getGmailClient, getCalendarClient } = require("../../services/google");
const { listUnread, sendEmail } = require("../../tools/gmailTools");
const { listEvents, createEvent } = require("../../tools/calendarTools");
const User = require("../../models/User");

// Initialize Mongo Connection for this process
if (process.env.MONGODB_URI) {
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => console.error("[GoogleMCP] Connected to MongoDB"))
        .catch(err => console.error("[GoogleMCP] MongoDB Error:", err));
} else {
    console.error("[GoogleMCP] Warning: MONGODB_URI not set");
}

const server = new McpServer({
    name: "google-server",
    version: "1.0.0",
});

// --- Gmail Tools ---

// We can reuse the existing tool functions but we need to wrap them to match the MCP signature
// The existing tools take (userId, args)
// The MCP tools take (args) where args includes userId

server.tool(
    "gmail_list_unread",
    "List unread emails for the user",
    {
        userId: z.string().describe("The user ID to fetch emails for"),
        maxResults: z.number().optional().default(10).describe("Max number of emails to return"),
    },
    async ({ userId, maxResults }) => {
        try {
            // Reuse existing tool logic
            const emails = await listUnread(userId, { maxResults });
            if (emails.length === 0) {
                return { content: [{ type: "text", text: "No unread messages found." }] };
            }

            // Format for chat output
            const formatted = emails.map(e => `- [${e.date}] ${e.from}: ${e.subject} (ID: ${e.id})`).join("\n");

            return {
                content: [{ type: "text", text: formatted }]
            };
        } catch (error) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
        }
    }
);

server.tool(
    "gmail_send_email",
    "Send an email",
    {
        userId: z.string(),
        to: z.string(),
        subject: z.string(),
        body: z.string(),
    },
    async ({ userId, to, subject, body }) => {
        try {
            const result = await sendEmail(userId, { to, subject, body });
            return {
                content: [{ type: "text", text: `Email sent successfully. ID: ${result.id}` }]
            };
        } catch (error) {
            return { content: [{ type: "text", text: `Error sending email: ${error.message}` }], isError: true };
        }
    }
);


// --- Calendar Tools ---

server.tool(
    "calendar_list_events",
    "List calendar events",
    {
        userId: z.string(),
        timeMin: z.string().optional().describe("ISO date string for start time"),
        timeMax: z.string().optional().describe("ISO date string for end time"),
        maxResults: z.number().optional().default(10),
    },
    async ({ userId, timeMin, timeMax, maxResults }) => {
        try {
            const events = await listEvents(userId, { timeMin, timeMax, maxResults });

            if (!events || events.length === 0) {
                return { content: [{ type: "text", text: "No upcoming events found." }] };
            }

            const formatted = events.map((event, i) => {
                const start = event.start.dateTime || event.start.date;
                const summary = event.summary || '(No Title)';
                return `${i + 1}. ${start} - ${summary}`;
            }).join("\n");

            return {
                content: [{ type: "text", text: formatted }]
            };
        } catch (error) {
            return { content: [{ type: "text", text: `Error listing events: ${error.message}` }], isError: true };
        }
    }
);

server.tool(
    "calendar_create_event",
    "Create a new calendar event",
    {
        userId: z.string(),
        summary: z.string(),
        description: z.string().optional(),
        start: z.string().describe("ISO date string"),
        end: z.string().describe("ISO date string"),
        attendees: z.array(z.string()).optional(),
    },
    async ({ userId, summary, description, start, end, attendees }) => {
        try {
            const result = await createEvent(userId, { summary, description, start, end, attendees });

            if (result.status === 'conflict') {
                return {
                    content: [{ type: "text", text: `Conflict detected: ${result.message}` }]
                };
            }

            return {
                content: [{ type: "text", text: `Event created: ${result.link}` }]
            };
        } catch (error) {
            return { content: [{ type: "text", text: `Error creating event: ${error.message}` }], isError: true };
        }
    }
);

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("[GoogleMCP] Google Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal Error in Google MCP Server:", error);
    process.exit(1);
});
