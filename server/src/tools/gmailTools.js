const { getGmailClient } = require('../services/google');

const listUnread = async (userId, { maxResults = 10 }) => {
    const gmail = await getGmailClient(userId);
    const res = await gmail.users.messages.list({
        userId: 'me',
        q: 'is:unread',
        maxResults,
    });

    if (!res.data.messages) return [];

    const emails = [];
    for (const message of res.data.messages) {
        const details = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'metadata',
            metadataHeaders: ['From', 'Subject', 'Date'],
        });

        const headers = details.data.payload.headers;
        const subject = headers.find(h => h.name === 'Subject')?.value;
        const from = headers.find(h => h.name === 'From')?.value;
        const date = headers.find(h => h.name === 'Date')?.value;

        emails.push({ id: message.id, subject, from, date, snippet: details.data.snippet });
    }
    return emails;
};

const sendEmail = async (userId, { to, subject, body }) => {
    const gmail = await getGmailClient(userId);

    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const messageParts = [
        `From: Me <me>`,
        `To: ${to}`,
        `Subject: ${utf8Subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/plain; charset=utf-8`,
        `Content-Transfer-Encoding: 7bit`,
        ``,
        body,
    ];
    const message = messageParts.join('\n');

    const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const res = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
            raw: encodedMessage,
        },
    });
    return res.data;
};

const trashEmail = async (userId, { messageId }) => {
    console.log(`[Gmail] Trashing message ${messageId}`);
    const gmail = await getGmailClient(userId);
    await gmail.users.messages.trash({
        userId: 'me',
        id: messageId,
    });
    return { success: true };
};

const createDraft = async (userId, { to, subject, body }) => {
    console.log(`[Gmail] Creating draft for ${to}`);
    const gmail = await getGmailClient(userId);

    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const messageParts = [
        `From: Me <me>`,
        `To: ${to}`,
        `Subject: ${utf8Subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/plain; charset=utf-8`,
        `Content-Transfer-Encoding: 7bit`,
        ``,
        body,
    ];
    const message = messageParts.join('\n');
    const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const res = await gmail.users.drafts.create({
        userId: 'me',
        requestBody: {
            message: {
                raw: encodedMessage,
            },
        },
    });
    return res.data;
};

const replyEmail = async (userId, { messageId, body, all = false }) => {
    console.log(`[Gmail] Replying to ${messageId}`);
    const gmail = await getGmailClient(userId);

    // Get original message to find threadId and recipients
    const format = 'metadata';
    const metadataHeaders = ['Subject', 'Message-ID', 'References', 'In-Reply-To', 'To', 'From', 'Cc'];
    const original = await gmail.users.messages.get({ userId: 'me', id: messageId, format, metadataHeaders });

    const headers = original.data.payload.headers;
    const subject = headers.find(h => h.name === 'Subject')?.value;
    const from = headers.find(h => h.name === 'From')?.value;
    // reply requires prefixing Re: if not present (though Gmail UI handles it, API might not auto-add it to raw)
    const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;

    // Simplistic recipient logic
    const to = from;

    const utf8Subject = `=?utf-8?B?${Buffer.from(replySubject).toString('base64')}?=`;
    const messageParts = [
        `To: ${to}`,
        `Subject: ${utf8Subject}`,
        `In-Reply-To: ${headers.find(h => h.name === 'Message-ID')?.value}`,
        `References: ${headers.find(h => h.name === 'References')?.value} ${headers.find(h => h.name === 'Message-ID')?.value}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/plain; charset=utf-8`,
        `Content-Transfer-Encoding: 7bit`,
        ``,
        body,
    ];
    const message = messageParts.join('\n');
    const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const res = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
            raw: encodedMessage,
            threadId: original.data.threadId
        },
    });
    return res.data;
};





module.exports = { listUnread, sendEmail, trashEmail, createDraft, replyEmail };
