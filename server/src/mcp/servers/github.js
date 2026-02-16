const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const axios = require("axios");
const dotenv = require("dotenv");
const path = require("path");
const mongoose = require("mongoose");
const User = require("../../models/User");

// Load .env from server root
dotenv.config({ path: path.join(__dirname, "../../../.env") });

// Connect to MongoDB for user tokens
if (process.env.MONGODB_URI) {
    mongoose.connect(process.env.MONGODB_URI);
}

const GITHUB_TOKEN_DEFAULT = process.env.GITHUB_TOKEN;
const API_BASE = "https://api.github.com";

const getGithubClient = (token) => axios.create({
    baseURL: API_BASE,
    headers: {
        Authorization: token ? `token ${token}` : "",
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "mcp-chatbot-server"
    }
});

const server = new Server(
    {
        name: "github-server",
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
                name: "search_repositories",
                description: "Search for GitHub repositories",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: { type: "string", description: "Search query" },
                    },
                    required: ["query"],
                },
            },
            {
                name: "get_repository",
                description: "Get details of a specific repository",
                inputSchema: {
                    type: "object",
                    properties: {
                        owner: { type: "string" },
                        repo: { type: "string" },
                        userId: { type: "string" },
                    },
                    required: ["owner", "repo"],
                },
            },
            {
                name: "list_issues",
                description: "List issues in a repository",
                inputSchema: {
                    type: "object",
                    properties: {
                        owner: { type: "string" },
                        repo: { type: "string" },
                        userId: { type: "string" },
                        state: { type: "string", enum: ["open", "closed", "all"], default: "open" },
                    },
                    required: ["owner", "repo"],
                },
            },
            {
                name: "create_pull_request",
                description: "Create a new pull request",
                inputSchema: {
                    type: "object",
                    properties: {
                        owner: { type: "string" },
                        repo: { type: "string" },
                        title: { type: "string" },
                        body: { type: "string" },
                        head: { type: "string", description: "The name of the branch where your changes are implemented." },
                        base: { type: "string", description: "The name of the branch you want the changes pulled into." },
                        userId: { type: "string" },
                    },
                    required: ["owner", "repo", "title", "head", "base"],
                },
            },
            {
                name: "list_user_repositories",
                description: "List repositories for the authenticated user, sorted by last push",
                inputSchema: {
                    type: "object",
                    properties: {
                        userId: { type: "string" },
                        per_page: { type: "number", default: 10 },
                        type: { type: "string", enum: ["all", "owner", "public", "private", "member"], default: "owner" },
                    },
                    required: [],
                },
            },
            {
                name: "get_repository_readme",
                description: "Get the README content of a repository",
                inputSchema: {
                    type: "object",
                    properties: {
                        owner: { type: "string" },
                        repo: { type: "string" },
                        userId: { type: "string" },
                    },
                    required: ["owner", "repo"],
                },
            },
            {
                name: "list_repository_files",
                description: "List files in a repository directory",
                inputSchema: {
                    type: "object",
                    properties: {
                        owner: { type: "string" },
                        repo: { type: "string" },
                        path: { type: "string", description: "Directory path (empty for root)" },
                        userId: { type: "string" },
                    },
                    required: ["owner", "repo"],
                },
            },
            {
                name: "get_file_contents",
                description: "Get the content of a file in a repository",
                inputSchema: {
                    type: "object",
                    properties: {
                        owner: { type: "string" },
                        repo: { type: "string" },
                        path: { type: "string", description: "File path" },
                        userId: { type: "string" },
                    },
                    required: ["owner", "repo", "path"],
                },
            },
            {
                name: "create_issue",
                description: "Create a new issue in a repository",
                inputSchema: {
                    type: "object",
                    properties: {
                        owner: { type: "string" },
                        repo: { type: "string" },
                        title: { type: "string" },
                        body: { type: "string" },
                        userId: { type: "string" },
                    },
                    required: ["owner", "repo", "title"],
                },
            },
            {
                name: "create_issue_comment",
                description: "Add a comment to an existing issue",
                inputSchema: {
                    type: "object",
                    properties: {
                        owner: { type: "string" },
                        repo: { type: "string" },
                        issue_number: { type: "number" },
                        body: { type: "string" },
                        userId: { type: "string" },
                    },
                    required: ["owner", "repo", "issue_number", "body"],
                },
            }
        ],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    let token = GITHUB_TOKEN_DEFAULT;

    if (args.userId) {
        try {
            const user = await User.findById(args.userId);
            if (user && user.githubToken) {
                token = user.githubToken;
            }
        } catch (e) {
            console.error("DB Error fetching user token:", e);
        }
    }

    if (!token && name !== "search_repositories") {
        return {
            content: [{ type: "text", text: "Error: No GitHub token found. Please connect your GitHub account in Settings." }],
            isError: true
        };
    }

    const githubAxios = getGithubClient(token);

    try {
        switch (name) {
            case "search_repositories": {
                const res = await githubAxios.get(`/search/repositories`, { params: { q: args.query } });
                return {
                    content: [{ type: "text", text: JSON.stringify(res.data.items.slice(0, 5), null, 2) }]
                };
            }
            case "get_repository": {
                const res = await githubAxios.get(`/repos/${args.owner}/${args.repo}`);
                return {
                    content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }]
                };
            }
            case "list_issues": {
                const res = await githubAxios.get(`/repos/${args.owner}/${args.repo}/issues`, { params: { state: args.state } });
                return {
                    content: [{ type: "text", text: JSON.stringify(res.data.slice(0, 10), null, 2) }]
                };
            }
            case "create_pull_request": {
                const res = await githubAxios.post(`/repos/${args.owner}/${args.repo}/pulls`, {
                    title: args.title,
                    body: args.body,
                    head: args.head,
                    base: args.base
                });
                return {
                    content: [{ type: "text", text: `Pull Request created: ${res.data.html_url}` }]
                };
            }
            case "list_user_repositories": {
                const res = await githubAxios.get(`/user/repos`, {
                    params: {
                        sort: "pushed",
                        per_page: args.per_page || 10,
                        direction: "desc",
                        type: args.type || "owner"
                    }
                });
                const repoList = res.data.map(repo => ({
                    name: repo.full_name,
                    description: repo.description,
                    pushed_at: repo.pushed_at,
                    html_url: repo.html_url
                }));
                return {
                    content: [{ type: "text", text: JSON.stringify(repoList, null, 2) }]
                };
            }
            case "get_repository_readme": {
                const res = await githubAxios.get(`/repos/${args.owner}/${args.repo}/readme`);
                // Content is base64 encoded
                const content = Buffer.from(res.data.content, 'base64').toString('utf8');
                return {
                    content: [{ type: "text", text: content }]
                };
            }
            case "list_repository_files": {
                const path = args.path || "";
                const res = await githubAxios.get(`/repos/${args.owner}/${args.repo}/contents/${path}`);
                const files = res.data.map(item => ({
                    name: item.name,
                    path: item.path,
                    type: item.type,
                    size: item.size
                }));
                return {
                    content: [{ type: "text", text: JSON.stringify(files, null, 2) }]
                };
            }
            case "get_file_contents": {
                const res = await githubAxios.get(`/repos/${args.owner}/${args.repo}/contents/${args.path}`);
                if (Array.isArray(res.data)) {
                    throw new Error("Target is a directory, not a file. Use list_repository_files instead.");
                }
                const content = Buffer.from(res.data.content, 'base64').toString('utf8');
                return {
                    content: [{ type: "text", text: content }]
                };
            }
            case "create_issue": {
                const res = await githubAxios.post(`/repos/${args.owner}/${args.repo}/issues`, {
                    title: args.title,
                    body: args.body
                });
                return {
                    content: [{ type: "text", text: `Issue created: ${res.data.html_url}` }]
                };
            }
            case "create_issue_comment": {
                const res = await githubAxios.post(`/repos/${args.owner}/${args.repo}/issues/${args.issue_number}/comments`, {
                    body: args.body
                });
                return {
                    content: [{ type: "text", text: `Comment added: ${res.data.html_url}` }]
                };
            }
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    } catch (error) {
        return {
            content: [{ type: "text", text: `GitHub API Error: ${error.response?.data?.message || error.message}` }],
            isError: true
        };
    }
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("GitHub MCP server running on stdio");
}

main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
