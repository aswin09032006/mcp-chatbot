const axios = require('axios');

/**
 * Search the web using Brave Search API
 * Free tier: 2,000 searches/month
 * Docs: https://brave.com/search/api/
 */
class SearchService {
    constructor() {
        this.apiKey = process.env.BRAVE_SEARCH_API_KEY;
        this.baseUrl = 'https://api.search.brave.com/res/v1/web/search';
    }

    /**
     * Search the web and return top results
     * @param {string} query - Search query
     * @param {number} numResults - Number of results to return (default: 5)
     * @returns {Promise<Array>} Array of search results
     */
    async searchWeb(query, numResults = 5) {
        if (!this.apiKey) {
            throw new Error('BRAVE_SEARCH_API_KEY not configured in environment variables');
        }

        try {
            const response = await axios.get(this.baseUrl, {
                params: {
                    q: query,
                    count: numResults,
                    search_lang: 'en',
                    safesearch: 'moderate'
                },
                headers: {
                    'Accept': 'application/json',
                    'Accept-Encoding': 'gzip',
                    'X-Subscription-Token': this.apiKey
                },
                timeout: 10000 // 10 second timeout
            });

            const results = response.data.web?.results || [];

            // Transform to consistent format
            return results.slice(0, numResults).map((result, index) => ({
                position: index + 1,
                title: result.title,
                url: result.url,
                snippet: result.description || '',
                displayUrl: result.url.replace(/^https?:\/\//, '').split('/')[0],
                favicon: `https://www.google.com/s2/favicons?domain=${result.url}&sz=32`
            }));

        } catch (error) {
            console.error('Brave Search API Error:', error.message);

            // Provide fallback error handling
            if (error.response?.status === 401) {
                throw new Error('Invalid Brave Search API key. Please check your BRAVE_SEARCH_API_KEY environment variable.');
            } else if (error.response?.status === 429) {
                throw new Error('Brave Search API rate limit exceeded. Free tier allows 2,000 searches/month.');
            } else if (error.code === 'ECONNABORTED') {
                throw new Error('Search request timed out. Please try again.');
            }

            throw new Error(`Search failed: ${error.message}`);
        }
    }

    /**
     * Get search suggestions (autocomplete)
     * @param {string} query - Partial query
     * @returns {Promise<Array>} Array of suggestions
     */
    async getSuggestions(query) {
        if (!this.apiKey) {
            return [];
        }

        try {
            const response = await axios.get('https://api.search.brave.com/res/v1/suggest/search', {
                params: { q: query },
                headers: {
                    'Accept': 'application/json',
                    'X-Subscription-Token': this.apiKey
                },
                timeout: 5000
            });

            return response.data[1] || []; // Returns array of suggestion strings
        } catch (error) {
            console.error('Suggestions error:', error.message);
            return [];
        }
    }
}

// Singleton instance
const searchService = new SearchService();

module.exports = {
    searchWeb: (query, numResults) => searchService.searchWeb(query, numResults),
    getSuggestions: (query) => searchService.getSuggestions(query)
};
