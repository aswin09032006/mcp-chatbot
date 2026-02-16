const express = require('express');
const multer = require('multer');
const mammoth = require('mammoth');
const router = express.Router();

const { PDFParse } = require('pdf-parse');

// Configure Multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

router.post('/', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { mimetype, buffer, margin } = req.file;
        let text = '';

        if (mimetype === 'application/pdf') {
            const parser = new PDFParse({ data: buffer });
            try {
                const data = await parser.getText();
                text = data.text;
            } finally {
                await parser.destroy();
            }
        } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const result = await mammoth.extractRawText({ buffer: buffer });
            text = result.value;
        } else if (mimetype === 'text/plain' || mimetype === 'text/markdown' || mimetype === 'application/json' || mimetype === 'text/javascript' || mimetype === 'text/x-python') {
            text = buffer.toString('utf-8');
        } else {
            return res.status(400).json({ error: 'Unsupported file type' });
        }

        res.json({
            text: text.trim(),
            filename: req.file.originalname,
            type: mimetype
        });

    } catch (error) {
        console.error('File upload error details:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ error: 'Failed to process file: ' + error.message });
    }
});

module.exports = router;
