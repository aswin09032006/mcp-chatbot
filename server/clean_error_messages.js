// Clean old error messages from chat history
const mongoose = require('mongoose');
require('dotenv').config();

const Chat = require('./src/models/Chat');

async function cleanErrorMessages() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Remove messages that contain raw JSON error strings
        const result = await Chat.updateMany(
            {},
            {
                $pull: {
                    messages: {
                        $or: [
                            { role: 'system' },
                            { content: { $regex: /\{"error".*"expected".*"code".*"invalid_type"/i } },
                            { content: { $regex: /\{"success".*"task".*"id".*"instruction"/i } }
                        ]
                    }
                }
            }
        );

        console.log(`Cleaned ${result.modifiedCount} chats`);

        // Also clean up any assistant messages that are just raw JSON
        const result2 = await Chat.updateMany(
            {},
            {
                $pull: {
                    messages: {
                        role: 'assistant',
                        content: { $regex: /^\s*\{.*\}\s*$/s }
                    }
                }
            }
        );

        console.log(`Cleaned ${result2.modifiedCount} more chats with JSON responses`);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

cleanErrorMessages();
