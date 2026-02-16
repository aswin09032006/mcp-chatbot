const { CustomMcpServer } = require("../CustomServer");
const z = require("zod");

// Import Tools
const browserTools = require("../../tools/browserTools");

// Create Server
const server = new CustomMcpServer({
    name: "browser-automation-server",
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
 * Register Browser Tools
 */

// --- Browser Tools (Real) ---
server.tool("browser_search", "Search the web",
    { query: z.string(), num_results: z.number().optional() },
    async ({ query, num_results }) => formatResult(await browserTools.browserSearch(query, num_results))
);

server.tool("browser_get_history", "Get browsing history",
    { userId: z.string(), limit: z.number().optional() },
    async ({ userId, limit }) => formatResult(await browserTools.getBrowsingHistory(userId, limit))
);

// --- Browser Tools (Stub/Legacy for Frontend Action) ---
server.tool("open_url", "Open URL in side browser. Use this tool automatically whenever the user wants to 'see', 'open', 'view', or 'visit' a website. It will trigger a UI action to open a new tab.",
    { url: z.string().describe("The full URL to open"), title: z.string().optional().describe("A title for the tab") },
    async ({ url, title }) => formatResult({ success: true, url, message: `Opening ${url} in side browser` })
);

server.tool("browser_extract_content", "Extract content from active tab",
    { tabId: z.string().optional() },
    async ({ tabId }) => formatResult({ success: true, api_call: 'browser_extract_content', tabId })
);

server.tool("browser_screenshot", "Capture screenshot",
    { tabId: z.string().optional() },
    async ({ tabId }) => formatResult({ success: true, api_call: 'browser_screenshot', tabId })
);

server.tool("browser_highlight_text", "Highlight text on page",
    { tabId: z.string().optional(), text: z.string() },
    async ({ tabId, text }) => formatResult({ success: true, api_call: 'browser_highlight_text', tabId, text })
);

// --- LinkedIn Tools (Browser Automation) ---
server.tool("linkedin_post", "Create a post on LinkedIn",
    { content: z.string(), visibility: z.enum(["connections", "public"]).optional() },
    async ({ content, visibility }) => formatResult({ success: true, api_call: 'linkedin_post', content, visibility })
);

server.tool("linkedin_search", "Search LinkedIn",
    { query: z.string(), type: z.enum(["people", "jobs", "posts", "all"]).optional() },
    async ({ query, type }) => formatResult({ success: true, api_call: 'linkedin_search', query, type })
);

// --- Quick Access Tools ---
server.tool("open_calendar", "Instantly open Google Calendar in the integrated sidebar browser. Use this instead of providing a link when the user wants to see their calendar.",
    {},
    async () => formatResult({
        success: true,
        url: 'https://calendar.google.com',
        title: 'Google Calendar',
        message: 'Opening Google Calendar'
    })
);

server.tool("open_gmail", "Instantly open Gmail in the integrated sidebar browser. Use this whenever the user wants to check mail or open Gmail.",
    {},
    async () => formatResult({
        success: true,
        url: 'https://mail.google.com',
        title: 'Gmail',
        message: 'Opening Gmail'
    })
);

server.tool("open_drive", "Instantly open Google Drive in the integrated sidebar browser. Use this whenever the user wants to see their files or open Drive.",
    {},
    async () => formatResult({
        success: true,
        url: 'https://drive.google.com',
        title: 'Google Drive',
        message: 'Opening Google Drive'
    })
);

// Start Server
async function main() {
    console.error("Browser MCP Server running on stdio");
    await server.connect();
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
