const { CustomMcpServer } = require("./CustomServer");
const z = require("zod");

// Import Tools
const calendarTools = require("../tools/calendarTools");
const gmailTools = require("../tools/gmailTools");
const reminderTools = require("../tools/reminderTools");
const docsTools = require("../tools/docsTools");
const sheetsTools = require("../tools/sheetsTools");
const contactsTools = require("../tools/contactsTools");
const driveTools = require("../tools/driveTools");
const browserTools = require("../tools/browserTools");

// Create Server
const server = new CustomMcpServer({
    name: "mcp-chatbot-server",
    version: "1.0.0"
});

// Helper to format results for MCP
const formatResult = (data) => {
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(data, null, 2)
            }
        ]
    };
};

/**
 * Register Tools
 * Note: All tools assume 'userId' is passed in the arguments.
 * The MCP Client (chat service) MUST inject this.
 */

// --- Calendar Tools ---
server.tool(
    "list_calendar_events",
    "List calendar events. Default to today if no time provided.",
    {
        userId: z.string(),
        timeMin: z.string().optional(),
        timeMax: z.string().optional(),
        maxResults: z.number().optional()
    },
    async ({ userId, timeMin, timeMax, maxResults }) => {
        const result = await calendarTools.listEvents(userId, { timeMin, timeMax, maxResults });
        return formatResult(result);
    }
);

server.tool(
    "create_calendar_event",
    "Create a calendar event with optional Google Meet link",
    {
        userId: z.string(),
        summary: z.string(),
        description: z.string().optional(),
        start: z.string().describe("ISO start time"),
        end: z.string().describe("ISO end time"),
        attendees: z.array(z.string()).optional(),
        timeZone: z.string().optional()
    },
    async ({ userId, ...args }) => {
        const result = await calendarTools.createEvent(userId, args);
        return formatResult(result);
    }
);

server.tool(
    "update_calendar_event",
    "Update a calendar event",
    {
        userId: z.string(),
        eventId: z.string(),
        summary: z.string().optional(),
        description: z.string().optional(),
        start: z.string().optional(),
        end: z.string().optional()
    },
    async ({ userId, ...args }) => {
        const result = await calendarTools.updateEvent(userId, args);
        return formatResult(result);
    }
);

server.tool(
    "delete_calendar_event",
    "Delete a calendar event",
    {
        userId: z.string(),
        eventId: z.string()
    },
    async ({ userId, eventId }) => {
        const result = await calendarTools.deleteEvent(userId, { eventId });
        return formatResult(result);
    }
);

// --- Gmail Tools ---
server.tool(
    "list_unread_emails",
    "List unread emails",
    {
        userId: z.string(),
        maxResults: z.number().optional()
    },
    async ({ userId, maxResults }) => {
        const result = await gmailTools.listUnread(userId, { maxResults });
        return formatResult(result);
    }
);

server.tool(
    "send_email",
    "Send an email",
    {
        userId: z.string(),
        to: z.string(),
        subject: z.string(),
        body: z.string()
    },
    async ({ userId, ...args }) => {
        const result = await gmailTools.sendEmail(userId, args);
        return formatResult(result);
    }
);

server.tool(
    "trash_email",
    "Move an email to trash",
    {
        userId: z.string(),
        messageId: z.string()
    },
    async ({ userId, messageId }) => {
        const result = await gmailTools.trashEmail(userId, { messageId });
        return formatResult(result);
    }
);

server.tool(
    "create_draft",
    "Create a draft email without sending",
    {
        userId: z.string(),
        to: z.string(),
        subject: z.string(),
        body: z.string()
    },
    async ({ userId, ...args }) => {
        const result = await gmailTools.createDraft(userId, args);
        return formatResult(result);
    }
);

server.tool(
    "reply_email",
    "Reply to an email",
    {
        userId: z.string(),
        messageId: z.string(),
        body: z.string()
    },
    async ({ userId, ...args }) => {
        const result = await gmailTools.replyEmail(userId, args);
        return formatResult(result);
    }
);

// --- Docs Tools ---
server.tool(
    "create_document",
    "Create a new Google Doc",
    {
        userId: z.string(),
        title: z.string()
    },
    async ({ userId, title }) => {
        const result = await docsTools.createDocument(userId, { title });
        return formatResult(result);
    }
);

server.tool(
    "read_document",
    "Read content of a Google Doc",
    {
        userId: z.string(),
        documentId: z.string()
    },
    async ({ userId, documentId }) => {
        const result = await docsTools.readDocument(userId, { documentId });
        return formatResult(result);
    }
);

server.tool(
    "append_text",
    "Append text to a Google Doc",
    {
        userId: z.string(),
        documentId: z.string(),
        text: z.string()
    },
    async ({ userId, ...args }) => {
        const result = await docsTools.appendText(userId, args);
        return formatResult(result);
    }
);

// --- Sheets Tools ---
server.tool(
    "create_sheet",
    "Create a new Google Sheet",
    {
        userId: z.string(),
        title: z.string()
    },
    async ({ userId, title }) => {
        const result = await sheetsTools.createSheet(userId, { title });
        return formatResult(result);
    }
);

server.tool(
    "append_row",
    "Append a row to a Google Sheet",
    {
        userId: z.string(),
        spreadsheetId: z.string(),
        values: z.array(z.string())
    },
    async ({ userId, ...args }) => {
        const result = await sheetsTools.appendRow(userId, args);
        return formatResult(result);
    }
);

server.tool(
    "read_sheet_range",
    "Read a range of cells from a Google Sheet",
    {
        userId: z.string(),
        spreadsheetId: z.string(),
        range: z.string()
    },
    async ({ userId, ...args }) => {
        const result = await sheetsTools.readRange(userId, args);
        return formatResult(result);
    }
);

// --- Contacts Tools ---
server.tool(
    "search_contacts",
    "Search Google Contacts",
    {
        userId: z.string(),
        query: z.string()
    },
    async ({ userId, query }) => {
        const result = await contactsTools.searchContacts(userId, { query });
        return formatResult(result);
    }
);

server.tool(
    "create_contact",
    "Create a new contact",
    {
        userId: z.string(),
        givenName: z.string(),
        familyName: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional()
    },
    async ({ userId, ...args }) => {
        const result = await contactsTools.createContact(userId, args);
        return formatResult(result);
    }
);

// --- Reminder Tools ---
server.tool(
    "create_reminder",
    "Create a reminder",
    {
        userId: z.string(),
        text: z.string(),
        dueDateTime: z.string()
    },
    async ({ userId, ...args }) => {
        const result = await reminderTools.createReminder(userId, args);
        return formatResult(result);
    }
);

server.tool(
    "list_reminders",
    "List reminders",
    {
        userId: z.string(),
        isCompleted: z.boolean().optional()
    },
    async ({ userId, isCompleted }) => {
        const result = await reminderTools.listReminders(userId, { isCompleted });
        return formatResult(result);
    }
);

server.tool(
    "delete_reminder",
    "Delete a reminder",
    {
        userId: z.string(),
        reminderId: z.string()
    },
    async ({ userId, reminderId }) => {
        const result = await reminderTools.deleteReminder(userId, { reminderId });
        return formatResult(result);
    }
);

// --- Browser Tools (Real) ---
server.tool(
    "browser_search",
    "Search the web",
    {
        query: z.string(),
        num_results: z.number().optional()
    },
    async ({ query, num_results }) => {
        const result = await browserTools.browserSearch(query, num_results);
        return formatResult(result);
    }
);

server.tool(
    "browser_get_history",
    "Get recent browsing history",
    {
        userId: z.string(),
        limit: z.number().optional()
    },
    async ({ userId, limit }) => {
        const result = await browserTools.getBrowsingHistory(userId, limit);
        return formatResult(result);
    }
);

server.tool(
    "search_files",
    "Search Google Drive files",
    {
        userId: z.string(),
        query: z.string(),
        mimeType: z.enum(["document", "sheet", "any"]).optional()
    },
    async ({ userId, ...args }) => {
        const result = await driveTools.searchFiles(userId, args);
        return formatResult(result);
    }
);

// --- Browser Tools (Stub/Legacy for Frontend Action) ---
server.tool(
    "open_url",
    "Open a URL in the side browser",
    {
        url: z.string(),
        title: z.string().optional()
    },
    async ({ url, title }) => {
        return formatResult({ success: true, url, message: `Opening ${url} in side browser` });
    }
);

server.tool(
    "browser_extract_content",
    "Extract content from active tab",
    {
        tabId: z.string().optional()
    },
    async ({ tabId }) => {
        return formatResult({ success: true, api_call: 'browser_extract_content', tabId });
    }
);

server.tool(
    "browser_screenshot",
    "Capture screenshot",
    {
        tabId: z.string().optional()
    },
    async ({ tabId }) => {
        return formatResult({ success: true, api_call: 'browser_screenshot', tabId });
    }
);

server.tool(
    "browser_highlight_text",
    "Highlight text on page",
    {
        tabId: z.string().optional(),
        text: z.string()
    },
    async ({ tabId, text }) => {
        return formatResult({ success: true, api_call: 'browser_highlight_text', tabId, text });
    }
);

// Start Server
async function main() {
    console.error("Custom MCP Server running on stdio");
    await server.connect();
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
