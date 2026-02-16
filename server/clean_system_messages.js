// Clean system messages from existing chats
const mongoose = require('mongoose');
require('dotenv').config();

const Chat = require('./src/models/Chat');

async function cleanSystemMessages() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const result = await Chat.updateMany(
            {},
            { $pull: { messages: { role: 'system' } } }
        );

        console.log(`Cleaned ${result.modifiedCount} chats`);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

cleanSystemMessages();
