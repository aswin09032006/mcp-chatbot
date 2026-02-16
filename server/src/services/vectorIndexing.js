const memoryService = require('./memory');

class VectorIndexingService {
    constructor() {
        this.chunkSize = 1000;
        this.chunkOverlap = 200;
    }

    /**
     * Chunks text into smaller pieces for better semantic search
     * @param {string} text 
     * @returns {string[]}
     */
    chunkText(text) {
        if (!text) return [];
        const chunks = [];
        let start = 0;
        while (start < text.length) {
            const end = start + this.chunkSize;
            chunks.push(text.substring(start, end));
            start += (this.chunkSize - this.chunkOverlap);
        }
        return chunks;
    }

    /**
     * Indexes a document into LanceDB
     * @param {string} documentId 
     * @param {string} title 
     * @param {string} content 
     * @param {string} userId 
     * @param {object} metadata 
     */
    async indexDocument(documentId, title, content, userId, metadata = {}) {
        await memoryService.init();
        const chunks = this.chunkText(content);
        console.log(`[VectorIndexing] Indexing ${title} (${chunks.length} chunks) for user ${userId}`);

        const table = await memoryService.ensureTable('documents', {
            vector: Array(384).fill(0), // Placeholder for schema
            text: '',
            documentId: '',
            title: '',
            userId: '',
            chunkIndex: 0,
            metadata: {},
            timestamp: 0
        });

        const records = await Promise.all(chunks.map(async (chunk, index) => {
            const vector = await memoryService.getEmbeddings(chunk);
            return {
                vector,
                text: chunk,
                documentId,
                title,
                userId,
                chunkIndex: index,
                metadata,
                timestamp: Date.now()
            };
        }));

        await table.add(records);
        return { success: true, chunkCount: chunks.length };
    }

    /**
     * Search indexed documents
     * @param {string} query 
     * @param {string} userId 
     * @param {number} limit 
     */
    async searchDocuments(query, userId, limit = 5) {
        await memoryService.init();
        const queryVector = await memoryService.getEmbeddings(query);
        const table = await memoryService.db.openTable('documents');

        const results = await table.search(queryVector).limit(limit).execute();
        const docs = [];
        for await (const item of results) {
            if (item.userId === userId) {
                docs.push({
                    text: item.text,
                    title: item.title,
                    documentId: item.documentId,
                    score: item._distance,
                    metadata: item.metadata
                });
            }
        }
        return docs;
    }
}

const vectorIndexingService = new VectorIndexingService();
module.exports = vectorIndexingService;
