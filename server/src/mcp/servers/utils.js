const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const z = require("zod");
const axios = require("axios");

const server = new McpServer({
    name: "utils-server",
    version: "1.0.0",
});

// Helper to strip HTML tags (basic)
function stripHtml(html) {
    if (!html) return "";
    return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

server.tool(
    "fetch_url",
    "Fetch the content of a URL (HTML, JSON, or XML/RSS)",
    {
        url: z.string().url().describe("The URL to fetch"),
        raw: z.boolean().optional().default(false).describe("If true, returns raw content. If false, attempts to strip HTML tags.")
    },
    async ({ url, raw }) => {
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 10000
            });

            let content = response.data;
            if (typeof content === 'object') {
                content = JSON.stringify(content, null, 2);
            } else if (!raw) {
                // simple heuristic to strip HTML if it looks like HTML
                if (typeof content === 'string' && content.trim().startsWith('<')) {
                    content = stripHtml(content);
                }
            }

            return {
                content: [{ type: "text", text: content.substring(0, 3000) }] // Limit size to ~3k chars (approx 750 tokens) to avoid RateLimit errors
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `Error fetching URL: ${error.message}` }],
                isError: true
            };
        }
    }
);

server.tool(
    "search_web",
    "Search the web using DuckDuckGo (HTML version)",
    {
        query: z.string().describe("The search query")
    },
    async ({ query }) => {
        try {
            const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
            const response = await axios.get(searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            // Parse DDG HTML results (simple regex as we lack cheerio)
            // Look for result snippet
            const html = response.data;
            let results = [];

            // Regex to capture title and link from DDG structure
            // <a class="result__a" href="...">Title</a>
            // This is fragile but works for simple "get info"
            const linkRegex = /<a class="result__a" href="([^"]+)">([^<]+)<\/a>/g;
            const snippetRegex = /<a class="result__snippet" href="[^"]+">([^<]+)<\/a>/g;

            let match;
            let i = 0;
            while ((match = linkRegex.exec(html)) !== null && i < 3) {
                const link = match[1];
                const title = match[2];
                // Try to find snippet
                // This is hard with regex, let's just dump the title and link
                results.push(`[${title}](${link})`);
                i++;
            }

            if (results.length === 0) {
                // Fallback: return stripHtml version of the body to see if we can get something
                return { content: [{ type: "text", text: stripHtml(html).substring(0, 1500) }] };
            }

            return {
                content: [{ type: "text", text: results.join('\n\n') }]
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `Error searching web: ${error.message}` }],
                isError: true
            };
        }
    }
);

async function main() {
    console.error("[UtilsMCP] Starting server...");
    const transport = new StdioServerTransport();
    console.error("[UtilsMCP] Connecting transport...");
    await server.connect(transport);
    console.error("[UtilsMCP] Utils Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal Error in Utils MCP Server:", error);
    process.exit(1);
});
