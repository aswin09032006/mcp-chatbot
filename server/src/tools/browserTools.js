const { searchWeb } = require('../services/searchService');
const { saveVisit, getRecentPages, searchHistory, getPageByUrl } = require('../services/historyService');

/**
 * Browser tool implementations for MCP
 * These tools are called by the LLM and coordinate between search API, Electron, and database
 */

/**
 * Search the web using Brave Search API
 * @param {string} query - Search query
 * @param {number} numResults - Number of results (default: 5)
 * @returns {Promise<Object>} Search results
 */
async function browserSearch(query, numResults = 5) {
    try {
        const results = await searchWeb(query, numResults);

        return {
            success: true,
            query: query,
            results: results,
            count: results.length,
            message: `Found ${results.length} results for "${query}"`
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: `Search failed: ${error.message}`
        };
    }
}

/**
 * Get browsing history for the user
 * @param {string} userId - User ID
 * @param {number} limit - Max results
 * @returns {Promise<Object>} Recent pages
 */
async function getBrowsingHistory(userId, limit = 10) {
    try {
        const pages = await getRecentPages(userId, limit);

        return {
            success: true,
            pages: pages,
            count: pages.length,
            message: `Retrieved ${pages.length} recent pages`
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: `Failed to retrieve history: ${error.message}`
        };
    }
}

/**
 * Save extracted content to browsing history
 * @param {string} userId - User ID
 * @param {Object} data - Page data with content
 * @returns {Promise<Object>} Saved entry
 */
async function saveToHistory(userId, data) {
    try {
        const entry = await saveVisit(userId, data);

        return {
            success: true,
            entry: {
                url: entry.url,
                title: entry.title,
                visitedAt: entry.visitedAt
            },
            message: `Saved "${entry.title}" to history`
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: `Failed to save to history: ${error.message}`
        };
    }
}

/**
 * Search browsing history
 * @param {string} userId - User ID
 * @param {string} query - Search query
 * @returns {Promise<Object>} Matching pages
 */
async function searchBrowsingHistory(userId, query) {
    try {
        const pages = await searchHistory(userId, query);

        return {
            success: true,
            pages: pages,
            count: pages.length,
            query: query,
            message: `Found ${pages.length} pages matching "${query}"`
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: `History search failed: ${error.message}`
        };
    }
}

/**
 * Get cached content for a URL to avoid re-extraction
 * @param {string} userId - User ID
 * @param {string} url - Page URL
 * @returns {Promise<Object>} Cached page or null
 */
async function getCachedPage(userId, url) {
    try {
        const page = await getPageByUrl(userId, url);

        if (page) {
            return {
                success: true,
                cached: true,
                page: {
                    url: page.url,
                    title: page.title,
                    content: page.extractedContent,
                    excerpt: page.excerpt,
                    visitedAt: page.visitedAt
                },
                message: `Retrieved cached content for "${page.title}"`
            };
        } else {
            return {
                success: true,
                cached: false,
                message: `No cached content found for ${url}`
            };
        }
    } catch (error) {
        return {
            success: false,
            error: error.message,
            message: `Failed to check cache: ${error.message}`
        };
    }
}

module.exports = {
    browserSearch,
    getBrowsingHistory,
    saveToHistory,
    searchBrowsingHistory,
    getCachedPage
};
