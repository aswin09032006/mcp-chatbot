const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');

/**
 * Extract clean, readable content from web pages using Mozilla's Readability
 * This is the same algorithm used by Firefox Reader View
 */
class ContentExtractor {
    /**
     * Extract article content from a BrowserView's webContents
     * @param {Electron.WebContents} webContents - The webContents to extract from
     * @returns {Promise<Object>} Extracted content with metadata
     */
    async extractContent(webContents) {
        try {
            // Get the full HTML of the page
            const html = await webContents.executeJavaScript(`
                document.documentElement.outerHTML
            `);

            const url = webContents.getURL();

            // Parse with JSDOM
            const dom = new JSDOM(html, { url });
            const document = dom.window.document;

            // Use Readability to extract article content
            const reader = new Readability(document, {
                debug: false,
                maxElemsToParse: 0, // No limit
                nbTopCandidates: 5,
                charThreshold: 500
            });

            const article = reader.parse();

            if (!article) {
                // Fallback to basic text extraction if Readability fails
                const fallbackContent = await webContents.executeJavaScript(`
                    document.body.innerText
                `);

                return {
                    success: false,
                    title: document.title || 'Untitled',
                    url: url,
                    content: fallbackContent.substring(0, 15000),
                    textContent: fallbackContent.substring(0, 15000),
                    excerpt: fallbackContent.substring(0, 300) + '...',
                    byline: null,
                    length: fallbackContent.length,
                    siteName: this.extractSiteName(url),
                    publishedTime: null,
                    readabilityFailed: true
                };
            }

            // Extract headings for better structure
            const headings = this.extractHeadings(article.content);

            return {
                success: true,
                title: article.title,
                url: url,
                content: article.textContent.substring(0, 15000), // Limit for LLM context
                textContent: article.textContent.substring(0, 15000),
                htmlContent: article.content, // Keep HTML for potential rendering
                excerpt: article.excerpt || article.textContent.substring(0, 300) + '...',
                byline: article.byline, // Author
                length: article.length, // Word count
                siteName: article.siteName || this.extractSiteName(url),
                publishedTime: this.extractPublishDate(document),
                headings: headings,
                readabilityFailed: false
            };

        } catch (error) {
            console.error('Content extraction error:', error);

            // Last resort fallback
            try {
                const fallbackText = await webContents.executeJavaScript(`
                    document.body.innerText
                `);

                return {
                    success: false,
                    title: webContents.getTitle(),
                    url: webContents.getURL(),
                    content: fallbackText.substring(0, 15000),
                    textContent: fallbackText.substring(0, 15000),
                    excerpt: fallbackText.substring(0, 300) + '...',
                    error: error.message,
                    readabilityFailed: true
                };
            } catch (innerError) {
                throw new Error(`Failed to extract content: ${innerError.message}`);
            }
        }
    }

    /**
     * Extract headings from HTML content for better structure
     * @param {string} htmlContent - HTML content
     * @returns {Array} Array of headings with level and text
     */
    extractHeadings(htmlContent) {
        try {
            const dom = new JSDOM(htmlContent);
            const headings = [];

            const headingElements = dom.window.document.querySelectorAll('h1, h2, h3, h4, h5, h6');
            headingElements.forEach((heading, index) => {
                if (index < 20) { // Limit to 20 headings
                    headings.push({
                        level: parseInt(heading.tagName[1]),
                        text: heading.textContent.trim()
                    });
                }
            });

            return headings;
        } catch (error) {
            return [];
        }
    }

    /**
     * Extract site name from URL
     * @param {string} url - URL
     * @returns {string} Site name
     */
    extractSiteName(url) {
        try {
            const hostname = new URL(url).hostname;
            return hostname.replace(/^www\./, '');
        } catch (error) {
            return 'Unknown';
        }
    }

    /**
     * Try to extract publish date from meta tags
     * @param {Document} document - DOM document
     * @returns {string|null} ISO date string or null
     */
    extractPublishDate(document) {
        const selectors = [
            'meta[property="article:published_time"]',
            'meta[name="publish-date"]',
            'meta[name="date"]',
            'meta[property="og:published_time"]',
            'time[datetime]'
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                const dateValue = element.getAttribute('content') || element.getAttribute('datetime');
                if (dateValue) {
                    try {
                        return new Date(dateValue).toISOString();
                    } catch (e) {
                        continue;
                    }
                }
            }
        }

        return null;
    }
}

// Singleton instance
const contentExtractor = new ContentExtractor();

module.exports = {
    extractContent: (webContents) => contentExtractor.extractContent(webContents)
};
