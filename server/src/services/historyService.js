const BrowsingHistory = require('../models/BrowsingHistory');

/**
 * Service for managing browsing history
 */
class HistoryService {
    /**
     * Save a visited page to history
     * @param {string} userId - User ID
     * @param {Object} data - Page data
     * @returns {Promise<Object>} Saved history entry
     */
    async saveVisit(userId, data) {
        try {
            const { url, title, content, excerpt, chatId, metadata } = data;

            // Check if this URL was already visited recently (within last hour)
            const recentVisit = await BrowsingHistory.findOne({
                userId,
                url,
                visitedAt: { $gte: new Date(Date.now() - 3600000) } // 1 hour
            });

            if (recentVisit) {
                // Update existing entry instead of creating duplicate
                recentVisit.extractedContent = content || recentVisit.extractedContent;
                recentVisit.excerpt = excerpt || recentVisit.excerpt;
                recentVisit.metadata = metadata || recentVisit.metadata;
                recentVisit.visitedAt = new Date();
                await recentVisit.save();
                return recentVisit;
            }

            // Create new history entry
            const historyEntry = new BrowsingHistory({
                userId,
                url,
                title,
                extractedContent: content,
                excerpt,
                chatId,
                metadata
            });

            await historyEntry.save();
            return historyEntry;
        } catch (error) {
            console.error('Error saving browsing history:', error);
            throw error;
        }
    }

    /**
     * Get recent pages visited by user
     * @param {string} userId - User ID
     * @param {number} limit - Max number of results
     * @returns {Promise<Array>} Recent pages
     */
    async getRecentPages(userId, limit = 10) {
        try {
            return await BrowsingHistory.find({ userId })
                .sort({ visitedAt: -1 })
                .limit(limit)
                .select('url title excerpt visitedAt metadata.siteName')
                .lean();
        } catch (error) {
            console.error('Error fetching recent pages:', error);
            return [];
        }
    }

    /**
     * Search browsing history
     * @param {string} userId - User ID
     * @param {string} query - Search query
     * @returns {Promise<Array>} Matching pages
     */
    async searchHistory(userId, query) {
        try {
            return await BrowsingHistory.find({
                userId,
                $or: [
                    { title: { $regex: query, $options: 'i' } },
                    { url: { $regex: query, $options: 'i' } },
                    { excerpt: { $regex: query, $options: 'i' } }
                ]
            })
                .sort({ visitedAt: -1 })
                .limit(20)
                .select('url title excerpt visitedAt')
                .lean();
        } catch (error) {
            console.error('Error searching history:', error);
            return [];
        }
    }

    /**
     * Get cached content for a specific URL
     * @param {string} userId - User ID
     * @param {string} url - Page URL
     * @returns {Promise<Object|null>} Cached page data
     */
    async getPageByUrl(userId, url) {
        try {
            return await BrowsingHistory.findOne({ userId, url })
                .sort({ visitedAt: -1 })
                .lean();
        } catch (error) {
            console.error('Error fetching page by URL:', error);
            return null;
        }
    }

    /**
     * Get history for a specific chat session
     * @param {string} userId - User ID
     * @param {string} chatId - Chat ID
     * @returns {Promise<Array>} Pages visited in this chat
     */
    async getChatHistory(userId, chatId) {
        try {
            return await BrowsingHistory.find({ userId, chatId })
                .sort({ visitedAt: -1 })
                .select('url title excerpt visitedAt')
                .lean();
        } catch (error) {
            console.error('Error fetching chat history:', error);
            return [];
        }
    }

    /**
     * Delete old history entries (manual cleanup)
     * @param {number} daysOld - Delete entries older than this many days
     * @returns {Promise<number>} Number of deleted entries
     */
    async deleteOldHistory(daysOld = 90) {
        try {
            const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
            const result = await BrowsingHistory.deleteMany({
                visitedAt: { $lt: cutoffDate }
            });
            return result.deletedCount;
        } catch (error) {
            console.error('Error deleting old history:', error);
            return 0;
        }
    }
}

// Singleton instance
const historyService = new HistoryService();

module.exports = {
    saveVisit: (userId, data) => historyService.saveVisit(userId, data),
    getRecentPages: (userId, limit) => historyService.getRecentPages(userId, limit),
    searchHistory: (userId, query) => historyService.searchHistory(userId, query),
    getPageByUrl: (userId, url) => historyService.getPageByUrl(userId, url),
    getChatHistory: (userId, chatId) => historyService.getChatHistory(userId, chatId),
    deleteOldHistory: (daysOld) => historyService.deleteOldHistory(daysOld)
};
