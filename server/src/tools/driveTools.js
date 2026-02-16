const { google } = require('googleapis');
const { getGoogleClient } = require('../services/google');

const getDriveClient = async (userId) => {
    const auth = await getGoogleClient(userId);
    return google.drive({ version: 'v3', auth });
};

/**
 * Search for files in Google Drive by name or other criteria
 * @param {string} userId
 * @param {object} params - { query: string, mimeType: string }
 */
const searchFiles = async (userId, { query, mimeType }) => {
    console.log(`[Drive] Searching for: ${query}${mimeType ? ` (type: ${mimeType})` : ''}`);
    try {
        const drive = await getDriveClient(userId);
        let q = `name contains '${query}' and trashed = false`;
        if (mimeType) {
            if (mimeType === 'document') q += ` and mimeType = 'application/vnd.google-apps.document'`;
            if (mimeType === 'sheet') q += ` and mimeType = 'application/vnd.google-apps.spreadsheet'`;
        }

        const res = await drive.files.list({
            q: q,
            fields: 'files(id, name, mimeType, webViewLink)',
            pageSize: 10
        });

        console.log(`[Drive] Found ${res.data.files.length} files.`);
        return res.data.files.map(f => ({
            id: f.id,
            name: f.name,
            mimeType: f.mimeType,
            url: f.webViewLink
        }));
    } catch (error) {
        console.error('[Drive] Search Error:', error);
        throw new Error(`Failed to search files: ${error.message}`);
    }
};

module.exports = { searchFiles };
