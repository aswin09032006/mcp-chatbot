const { google } = require('googleapis');
const User = require('../models/User');

const createOAuth2Client = () => {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );
};

const getGoogleClient = async (userId) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const client = createOAuth2Client();
    client.setCredentials(user.tokens);

    // Handle token refresh if needed
    if (user.tokens.expiry_date && user.tokens.expiry_date < Date.now()) {
        const { credentials } = await client.refreshAccessToken();
        user.tokens = credentials;
        await user.save();
        client.setCredentials(credentials);
    }

    return client;
};

const getCalendarClient = async (userId) => {
    const auth = await getGoogleClient(userId);
    return google.calendar({ version: 'v3', auth });
};

const getGmailClient = async (userId) => {
    const auth = await getGoogleClient(userId);
    return google.gmail({ version: 'v1', auth });
};

module.exports = { createOAuth2Client, getGoogleClient, getCalendarClient, getGmailClient };
