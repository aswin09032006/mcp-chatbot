const { google } = require('googleapis');
const { getGoogleClient } = require('../services/google');

const getDocsClient = async (userId) => {
    const auth = await getGoogleClient(userId);
    return google.docs({ version: 'v1', auth });
};

const createDocument = async (userId, { title }) => {
    console.log(`[Docs] Creating document: ${title}`);
    try {
        const docs = await getDocsClient(userId);
        const res = await docs.documents.create({
            requestBody: {
                title,
            },
        });
        console.log(`[Docs] Created. ID: ${res.data.documentId}`);
        return {
            documentId: res.data.documentId,
            title: res.data.title,
            url: `https://docs.google.com/document/d/${res.data.documentId}/edit`
        };
    } catch (error) {
        console.error('[Docs] Create Error:', error);
        throw new Error(`Failed to create document: ${error.message}`);
    }
};

const appendText = async (userId, { documentId, text }) => {
    if (!documentId || documentId.includes('<') || documentId.includes('>')) {
        throw new Error(`Invalid documentId: "${documentId}". You MUST provide a real ID from a search or creation result. Do not use placeholders.`);
    }
    console.log(`[Docs] Appending text to ${documentId}`);
    try {
        const docs = await getDocsClient(userId);
        const res = await docs.documents.batchUpdate({
            documentId,
            requestBody: {
                requests: [{
                    insertText: {
                        endOfSegmentLocation: {
                            segmentId: '', // Body
                        },
                        text: text + '\n',
                    },
                }],
            },
        });
        console.log(`[Docs] Text appended.`);
        return { success: true };
    } catch (error) {
        console.error('[Docs] Append Error:', error);
        throw new Error(`Failed to append text: ${error.message}`);
    }
};

const readDocument = async (userId, { documentId }) => {
    if (!documentId || documentId.includes('<') || documentId.includes('>')) {
        throw new Error(`Invalid documentId: "${documentId}". You MUST provide a real ID from a search or creation result. Do not use placeholders.`);
    }
    console.log(`[Docs] Reading document ${documentId}`);
    try {
        const docs = await getDocsClient(userId);
        const res = await docs.documents.get({ documentId });

        // Simple extraction of text
        let text = '';
        res.data.body.content.forEach(element => {
            if (element.paragraph) {
                element.paragraph.elements.forEach(el => {
                    if (el.textRun) {
                        text += el.textRun.content;
                    }
                });
            }
        });

        console.log(`[Docs] Read ${text.length} characters.`);
        return { title: res.data.title, content: text };
    } catch (error) {
        console.error('[Docs] Read Error:', error);
        throw new Error(`Failed to read document: ${error.message}`);
    }
};

module.exports = { createDocument, appendText, readDocument };
