const mongoose = require('mongoose');
const Chat = require('./src/models/Chat');

const chat = new Chat({
    userId: new mongoose.Types.ObjectId(), // Fake ID
    messages: [{
        role: 'user',
        content: 'Test message',
        attachments: [{
            filename: 'test.pdf',
            type: 'application/pdf',
            text: 'Content'
        }]
    }]
});

try {
    chat.validateSync();
    console.log('Validation successful!');
    console.log('Attachments:', chat.messages[0].attachments);
    process.exit(0);
} catch (error) {
    console.error('Validation failed:', error.message);
    process.exit(1);
}
