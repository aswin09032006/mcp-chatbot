try {
    require("@modelcontextprotocol/sdk/server/mcp.js");
    console.log("SDK installed");
} catch (e) {
    console.error("SDK missing", e);
}
