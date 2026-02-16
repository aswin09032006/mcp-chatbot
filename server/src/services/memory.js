const lancedb = require('@lancedb/lancedb');
const { pipeline } = require('@xenova/transformers');
const path = require('path');
const fs = require('fs');

class MemoryService {
    constructor() {
        this.db = null;
        this.messageTable = null;
        this.factTable = null;
        this.embedder = null;
        this.initialized = false;
        this.dbPath = path.join(__dirname, '../../.lancedb');
    }

    async init() {
        if (this.initialized) return;

        try {
            if (!fs.existsSync(this.dbPath)) {
                fs.mkdirSync(this.dbPath, { recursive: true });
            }

            this.db = await lancedb.connect(this.dbPath);

            if (!this.embedder) {
                console.log('Loading embedding model...');
                this.embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
                console.log('Embedding model loaded.');
            }

            const tableNames = await this.db.tableNames();

            if (tableNames.includes('messages')) {
                this.messageTable = await this.db.openTable('messages');
            }

            if (tableNames.includes('facts')) {
                this.factTable = await this.db.openTable('facts');
            }

            this.initialized = true;
            console.log('Memory Service Initialized');
        } catch (error) {
            console.error('Memory Service Init Failed:', error);
        }
    }

    async getEmbeddings(text) {
        if (!this.embedder) await this.init();
        const output = await this.embedder(text, { pooling: 'mean', normalize: true });
        return Array.from(output.data);
    }

    async ensureTable(tableName, dataItem) {
        const tableNames = await this.db.tableNames();
        if (tableNames.includes(tableName)) {
            return await this.db.openTable(tableName);
        } else {
            console.log(`Creating memory table: ${tableName}`);
            return await this.db.createTable(tableName, [dataItem]);
        }
    }

    async addMessage(role, content, userId, chatId) {
        try {
            if (!content || typeof content !== 'string') return;
            const vector = await this.getEmbeddings(content);
            const record = {
                vector,
                text: content,
                role,
                timestamp: Date.now(),
                chatId: chatId || 'global',
                userId: userId || 'unknown'
            };

            if (!this.messageTable) {
                this.messageTable = await this.ensureTable('messages', record);
            } else {
                await this.messageTable.add([record]);
            }
        } catch (error) {
            console.error('Failed to add message to memory:', error);
        }
    }

    async saveFact(text, category, userId, importance = 1) {
        try {
            if (!text || typeof text !== 'string') return;
            const vector = await this.getEmbeddings(text);
            const record = {
                vector,
                text,
                category: category || 'general',
                userId: userId || 'unknown',
                importance,
                timestamp: Date.now()
            };

            if (!this.factTable) {
                this.factTable = await this.ensureTable('facts', record);
            } else {
                await this.factTable.add([record]);
            }
            console.log(`[Memory] Saved fact: ${text.substring(0, 50)}...`);
            return { success: true };
        } catch (error) {
            console.error('Failed to save fact:', error);
            return { success: false, error: error.message };
        }
    }

    async searchContext(query, userId, limit = 5) {
        try {
            if (!this.initialized) await this.init();
            const queryVector = await this.getEmbeddings(query);

            const memories = [];

            // Search Facts first
            if (this.factTable) {
                const factResults = await this.factTable.search(queryVector).limit(3).execute();
                for await (const item of factResults) {
                    memories.push({ ...item, type: 'fact' });
                }
            }

            // Search Messages
            if (this.messageTable) {
                const msgResults = await this.messageTable.search(queryVector).limit(limit).execute();
                for await (const item of msgResults) {
                    memories.push({ ...item, type: 'message' });
                }
            }

            return memories.map(r => ({
                text: r.text,
                role: r.role || 'system',
                type: r.type,
                category: r.category,
                timestamp: r.timestamp,
                score: r._distance
            }));
        } catch (error) {
            console.error('Memory Search Failed:', error);
            return [];
        }
    }

    async deleteFact(text, userId) {
        try {
            if (!this.factTable) return { success: false, error: 'Fact table not found' };
            await this.factTable.delete(`text = "${text}" AND userId = "${userId}"`);
            return { success: true };
        } catch (error) {
            console.error('Delete Fact Failed:', error);
            return { success: false, error: error.message };
        }
    }

    async getAllFacts(userId) {
        try {
            if (!this.factTable) return [];
            const results = await this.factTable.search().execute();
            const facts = [];
            for await (const item of results) {
                if (item.userId === userId) facts.push(item);
            }
            return facts;
        } catch (error) {
            console.error('Get All Facts Failed:', error);
            return [];
        }
    }
}

const memoryService = new MemoryService();
module.exports = memoryService;
