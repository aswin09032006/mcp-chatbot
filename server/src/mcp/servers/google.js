const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");

// Load environment variables from the root server .env
dotenv.config({ path: path.join(__dirname, "../../../.env") });

// Initialize Mongo Connection for this process
if (process.env.MONGODB_URI) {
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => console.error("[GoogleMCP] Connected to MongoDB"))
        .catch(err => console.error("[GoogleMCP] MongoDB Error:", err));
} else {
    console.error("[GoogleMCP] Warning: MONGODB_URI not set");
}

const { CustomMcpServer } = require("../CustomServer");
const z = require("zod");

// Import Tools
const calendarTools = require("../../tools/calendarTools");
const gmailTools = require("../../tools/gmailTools");
const reminderTools = require("../../tools/reminderTools");
const docsTools = require("../../tools/docsTools");
const sheetsTools = require("../../tools/sheetsTools");
const contactsTools = require("../../tools/contactsTools");
const driveTools = require("../../tools/driveTools");

const vectorIndexingService = require("../../services/vectorIndexing");

// Create Server
const server = new CustomMcpServer({
    name: "google-workspace-server",
    version: "1.0.0"
});

// Helper to format results for MCP
const formatResult = (data) => {
    return {
        content: [
            {
                type: "text", // Could be optimized to return proper types but text is safe for now
                text: JSON.stringify(data, null, 2)
            }
        ]
    };
};

/**
 * Register Google Workspace Tools
 */

// --- Calendar Tools ---
server.tool("calendar_list_events", "List calendar events",
    { userId: z.string().optional(), timeMin: z.string().optional(), timeMax: z.string().optional(), maxResults: z.number().optional() },
    async ({ userId, ...args }) => formatResult(await calendarTools.listEvents(userId, args))
);

server.tool("calendar_create_event", "Create a calendar event",
    { userId: z.string().optional(), summary: z.string(), description: z.string().optional(), start: z.string(), end: z.string(), attendees: z.array(z.string()).optional() },
    async ({ userId, ...args }) => formatResult(await calendarTools.createEvent(userId, args))
);

server.tool("calendar_update_event", "Update a calendar event",
    { userId: z.string().optional(), eventId: z.string(), summary: z.string().optional() },
    async ({ userId, ...args }) => formatResult(await calendarTools.updateEvent(userId, args))
);

server.tool("calendar_delete_event", "Delete a calendar event",
    { userId: z.string().optional(), eventId: z.string() },
    async ({ userId, ...args }) => formatResult(await calendarTools.deleteEvent(userId, args))
);

// --- Gmail Tools ---
server.tool("gmail_list_unread", "List unread emails",
    { userId: z.string().optional(), maxResults: z.number().optional() },
    async ({ userId, ...args }) => formatResult(await gmailTools.listUnread(userId, args))
);

server.tool("gmail_send_email", "Send an email",
    { userId: z.string().optional(), to: z.string(), subject: z.string(), body: z.string() },
    async ({ userId, ...args }) => formatResult(await gmailTools.sendEmail(userId, args))
);

server.tool("trash_email", "Trash an email",
    { userId: z.string().optional(), messageId: z.string() },
    async ({ userId, ...args }) => formatResult(await gmailTools.trashEmail(userId, args))
);

server.tool("create_draft", "Create draft email",
    { userId: z.string().optional(), to: z.string(), subject: z.string(), body: z.string() },
    async ({ userId, ...args }) => formatResult(await gmailTools.createDraft(userId, args))
);

server.tool("reply_email", "Reply to email",
    { userId: z.string().optional(), messageId: z.string(), body: z.string() },
    async ({ userId, ...args }) => formatResult(await gmailTools.replyEmail(userId, args))
);

// --- Docs Tools ---
server.tool("create_document", "Create Google Doc",
    { userId: z.string().optional(), title: z.string() },
    async ({ userId, ...args }) => formatResult(await docsTools.createDocument(userId, args))
);

server.tool("read_document", "Read Google Doc",
    { userId: z.string().optional(), documentId: z.string() },
    async ({ userId, ...args }) => formatResult(await docsTools.readDocument(userId, args))
);

server.tool("append_text", "Append text to Doc",
    { userId: z.string(), documentId: z.string(), text: z.string() },
    async ({ userId, ...args }) => formatResult(await docsTools.appendText(userId, args))
);

// --- Sheets Tools ---
server.tool("create_sheet", "Create Google Sheet",
    { userId: z.string(), title: z.string() },
    async ({ userId, ...args }) => formatResult(await sheetsTools.createSheet(userId, args))
);

server.tool("append_row", "Append row to Sheet",
    { userId: z.string(), spreadsheetId: z.string(), values: z.array(z.string()) },
    async ({ userId, ...args }) => formatResult(await sheetsTools.appendRow(userId, args))
);

server.tool("read_sheet_range", "Read Sheet range",
    { userId: z.string(), spreadsheetId: z.string(), range: z.string() },
    async ({ userId, ...args }) => formatResult(await sheetsTools.readRange(userId, args))
);

// --- Contacts Tools ---
server.tool("search_contacts", "Search Contacts",
    { userId: z.string(), query: z.string() },
    async ({ userId, ...args }) => formatResult(await contactsTools.searchContacts(userId, args))
);

server.tool("create_contact", "Create Contact",
    { userId: z.string(), givenName: z.string(), familyName: z.string().optional(), email: z.string().optional(), phone: z.string().optional() },
    async ({ userId, ...args }) => formatResult(await contactsTools.createContact(userId, args))
);

// --- Reminder Tools ---
server.tool("create_reminder", "Create Reminder",
    { userId: z.string(), text: z.string(), dueDateTime: z.string() },
    async ({ userId, ...args }) => formatResult(await reminderTools.createReminder(userId, args))
);

server.tool("list_reminders", "List Reminders",
    { userId: z.string(), isCompleted: z.boolean().optional() },
    async ({ userId, ...args }) => formatResult(await reminderTools.listReminders(userId, args))
);

server.tool("delete_reminder", "Delete Reminder",
    { userId: z.string(), reminderId: z.string() },
    async ({ userId, ...args }) => formatResult(await reminderTools.deleteReminder(userId, args))
);

// --- Drive Tools ---
server.tool("search_files", "Search Drive Files",
    { userId: z.string(), query: z.string(), mimeType: z.enum(["document", "sheet", "any"]).optional() },
    async ({ userId, ...args }) => formatResult(await driveTools.searchFiles(userId, args))
);

server.tool("index_drive_file", "Ingest and index a Google Doc for semantic search",
    { userId: z.string(), documentId: z.string(), title: z.string() },
    async ({ userId, documentId, title }) => {
        const doc = await docsTools.readDocument(userId, { documentId });
        const result = await vectorIndexingService.indexDocument(documentId, title, doc.content, userId);
        return formatResult({ message: `Successfully indexed ${title}`, details: result });
    }
);

server.tool("search_drive_context", "Semantic search across indexed Google Drive documents",
    { userId: z.string(), query: z.string(), limit: z.number().optional() },
    async ({ userId, query, limit }) => formatResult(await vectorIndexingService.searchDocuments(query, userId, limit))
);

// Start Server
async function main() {
    console.error("Google Workspace MCP Server running on stdio");
    await server.connect();
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
