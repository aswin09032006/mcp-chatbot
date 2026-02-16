const { CustomMcpServer } = require("../CustomServer");
const fs = require('fs').promises;
const path = require('path');
const z = require("zod");

// Create Server
const server = new CustomMcpServer({
    name: "filesystem-server",
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

// Security: Sandbox implementation
const ALLOWED_ROOT = path.resolve(__dirname, '../../../../'); // Project root (d:\DEVELOPMENT\mcp chatbot)

/**
 * Validate path is safe and within root
 */
const validatePath = (requestedPath) => {
    const safeRoot = path.normalize(ALLOWED_ROOT);
    const resolvedPath = path.resolve(safeRoot, requestedPath);

    if (!resolvedPath.startsWith(safeRoot)) {
        throw new Error(`Access denied: Path must be within ${ALLOWED_ROOT}`);
    }
    return resolvedPath;
};

/**
 * Register Filesystem Tools
 */

server.tool("list_directory", "List files and directories in a path",
    { path: z.string().default(".") },
    async ({ path: dirPath }) => {
        try {
            const safePath = validatePath(dirPath);
            const items = await fs.readdir(safePath, { withFileTypes: true });

            const files = items.map(item => ({
                name: item.name,
                type: item.isDirectory() ? 'directory' : 'file',
                path: path.relative(ALLOWED_ROOT, path.join(safePath, item.name))
            }));

            return formatResult(files);
        } catch (error) {
            return formatResult({ error: error.message });
        }
    }
);

server.tool("read_file", "Read text content of a file",
    { path: z.string() },
    async ({ path: filePath }) => {
        try {
            const safePath = validatePath(filePath);
            const content = await fs.readFile(safePath, 'utf-8');
            return formatResult({ path: filePath, content });
        } catch (error) {
            return formatResult({ error: error.message });
        }
    }
);

server.tool("get_file_info", "Get file metadata (size, dates)",
    { path: z.string() },
    async ({ path: filePath }) => {
        try {
            const safePath = validatePath(filePath);
            const stats = await fs.stat(safePath);
            return formatResult({
                path: filePath,
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
                isDirectory: stats.isDirectory()
            });
        } catch (error) {
            return formatResult({ error: error.message });
        }
    }
);

/**
 * Enhanced Tools for "Antigravity-like" review
 */

server.tool("search_files", "Search for text within files (regex supported)",
    { path: z.string(), query: z.string(), includes: z.array(z.string()).optional() },
    async ({ path: searchPath, query, includes }) => {
        try {
            const rootPath = validatePath(searchPath);
            const regex = new RegExp(query, 'g');
            const results = [];
            const MAX_RESULTS = 50;

            // Simple recursive walker
            async function walk(currentPath) {
                if (results.length >= MAX_RESULTS) return;

                const entries = await fs.readdir(currentPath, { withFileTypes: true });
                for (const entry of entries) {
                    if (results.length >= MAX_RESULTS) break;

                    const fullPath = path.join(currentPath, entry.name);

                    // Skip node_modules, .git
                    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.lancedb') continue;

                    if (entry.isDirectory()) {
                        await walk(fullPath);
                    } else {
                        // Check extensions if provided
                        if (includes && includes.length > 0) {
                            const ext = path.extname(entry.name).slice(1);
                            if (!includes.includes(ext) && !includes.includes(entry.name)) continue;
                        } else {
                            // Default skip binary/large knowns
                            if (['.png', '.jpg', '.exe', '.dll', '.db'].includes(path.extname(entry.name))) continue;
                        }

                        try {
                            const content = await fs.readFile(fullPath, 'utf-8');
                            const matches = content.match(regex);
                            if (matches) {
                                results.push({
                                    file: path.relative(ALLOWED_ROOT, fullPath),
                                    matches: matches.length,
                                    preview: content.substring(content.search(regex), content.search(regex) + 100).replace(/\n/g, ' ')
                                });
                            }
                        } catch (e) { /* ignore read erors */ }
                    }
                }
            }

            await walk(rootPath);
            return formatResult({ count: results.length, results });

        } catch (error) {
            return formatResult({ error: error.message });
        }
    }
);

server.tool("find_files", "Find files by name (glob-like)",
    { path: z.string().default("."), pattern: z.string() },
    async ({ path: searchPath, pattern }) => {
        try {
            const rootPath = validatePath(searchPath);
            const results = [];
            const MAX_RESULTS = 50;
            const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i'); // Simple glob-to-regex

            async function walk(currentPath) {
                if (results.length >= MAX_RESULTS) return;
                const entries = await fs.readdir(currentPath, { withFileTypes: true });

                for (const entry of entries) {
                    if (results.length >= MAX_RESULTS) break;
                    const fullPath = path.join(currentPath, entry.name);
                    if (entry.name === 'node_modules' || entry.name === '.git') continue;

                    if (regex.test(entry.name)) {
                        results.push({
                            name: entry.name,
                            path: path.relative(ALLOWED_ROOT, fullPath),
                            type: entry.isDirectory() ? 'dir' : 'file'
                        });
                    }

                    if (entry.isDirectory()) {
                        await walk(fullPath);
                    }
                }
            }

            await walk(rootPath);
            return formatResult({ count: results.length, results });

        } catch (error) {
            return formatResult({ error: error.message });
        }
    }
);

// Start Server
async function main() {
    console.error(`Filesystem MCP Server running on stdio (Root: ${ALLOWED_ROOT})`);
    await server.connect();
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
