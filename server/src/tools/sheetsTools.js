const { google } = require('googleapis');
const { getGoogleClient } = require('../services/google');

const getSheetsClient = async (userId) => {
    const auth = await getGoogleClient(userId);
    return google.sheets({ version: 'v4', auth });
};

const createSheet = async (userId, { title }) => {
    console.log(`[Sheets] Creating sheet: ${title}`);
    try {
        const sheets = await getSheetsClient(userId);
        const res = await sheets.spreadsheets.create({
            requestBody: {
                properties: { title },
            },
        });
        console.log(`[Sheets] Created. ID: ${res.data.spreadsheetId}`);
        return {
            spreadsheetId: res.data.spreadsheetId,
            url: res.data.spreadsheetUrl
        };
    } catch (error) {
        console.error('[Sheets] Create Error:', error);
        throw new Error(`Failed to create sheet: ${error.message}`);
    }
};

const appendRow = async (userId, { spreadsheetId, range = 'Sheet1!A1', values }) => {
    if (!spreadsheetId || spreadsheetId.includes('<') || spreadsheetId.includes('>')) {
        throw new Error(`Invalid spreadsheetId: "${spreadsheetId}". You MUST provide a real ID from a search or creation result. Do not use placeholders.`);
    }
    console.log(`[Sheets] Appending row to ${spreadsheetId}:`, values);
    try {
        const sheets = await getSheetsClient(userId);
        const res = await sheets.spreadsheets.values.append({
            spreadsheetId,
            range,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [values],
            },
        });
        console.log(`[Sheets] Row appended.`);
        return res.data;
    } catch (error) {
        console.error('[Sheets] Append Error:', error);
        throw new Error(`Failed to append row: ${error.message}`);
    }
};

const readRange = async (userId, { spreadsheetId, range }) => {
    if (!spreadsheetId || spreadsheetId.includes('<') || spreadsheetId.includes('>')) {
        throw new Error(`Invalid spreadsheetId: "${spreadsheetId}". You MUST provide a real ID from a search or creation result. Do not use placeholders.`);
    }
    console.log(`[Sheets] Reading range ${range} from ${spreadsheetId}`);
    try {
        const sheets = await getSheetsClient(userId);
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });
        return { values: res.data.values };
    } catch (error) {
        console.error('[Sheets] Read Error:', error);
        throw new Error(`Failed to read range: ${error.message}`);
    }
};

module.exports = { createSheet, appendRow, readRange };
