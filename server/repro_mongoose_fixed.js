const mongoose = require('mongoose');

// PROPOSED FIX: Wrap 'type' in an object
const schema = new mongoose.Schema({
    attachments: [{
        filename: String,
        type: { type: String }, // FIXED
        text: String
    }]
});

const Model = mongoose.model('TestFixed', schema);

const doc = new Model({
    attachments: [{
        filename: 'test.pdf',
        type: 'application/pdf',
        text: 'some text'
    }]
});

console.log('Paths:', schema.paths);
// accessing the schema of the array elements
const attachmentSchema = schema.path('attachments').schema;
console.log('Attachment Schema Paths:', attachmentSchema ? Object.keys(attachmentSchema.paths) : 'None');

try {
    doc.validateSync();
    console.log('Validation passed');
    console.log('Doc:', doc.toObject());
} catch (err) {
    console.error('Validation failed:', err.message);
}
