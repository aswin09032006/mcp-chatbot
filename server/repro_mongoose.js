const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    attachments: [{
        filename: String,
        type: String,
        text: String
    }]
});

const Model = mongoose.model('Test', schema);

const doc = new Model({
    attachments: [{
        filename: 'test.pdf',
        type: 'application/pdf',
        text: 'some text'
    }]
});

console.log('Paths:', schema.paths);
console.log('Attachments type:', schema.path('attachments').caster.instance);

try {
    doc.validateSync();
    console.log('Validation passed');
} catch (err) {
    console.error('Validation failed:', err.message);
}
