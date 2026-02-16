const { google } = require('googleapis');
const { getGoogleClient } = require('../services/google');

const getPeopleClient = async (userId) => {
    const auth = await getGoogleClient(userId);
    return google.people({ version: 'v1', auth });
};

const searchContacts = async (userId, { query }) => {
    console.log(`[Contacts] Searching contacts: ${query}`);
    try {
        const people = await getPeopleClient(userId);
        const res = await people.people.searchContacts({
            query,
            readMask: 'names,emailAddresses,phoneNumbers',
        });

        if (!res.data.results) return [];

        const contacts = res.data.results.map(item => {
            const person = item.person;
            return {
                name: person.names?.[0]?.displayName,
                email: person.emailAddresses?.[0]?.value,
                phone: person.phoneNumbers?.[0]?.value,
            };
        });

        console.log(`[Contacts] Found ${contacts.length} contacts.`);
        return contacts;
    } catch (error) {
        console.error('[Contacts] Search Error:', error);
        // Search might fail if not enabled, fallback/ignore
        return [];
    }
};

const listContacts = async (userId, { pageSize = 10 }) => {
    console.log(`[Contacts] Listing contacts`);
    try {
        const people = await getPeopleClient(userId);
        const res = await people.people.connections.list({
            resourceName: 'people/me',
            pageSize,
            personFields: 'names,emailAddresses,phoneNumbers',
        });

        if (!res.data.connections) return [];

        const contacts = res.data.connections.map(person => ({
            name: person.names?.[0]?.displayName,
            email: person.emailAddresses?.[0]?.value,
            phone: person.phoneNumbers?.[0]?.value,
        }));

        return contacts;
    } catch (error) {
        console.error('[Contacts] List Error:', error);
        throw new Error(`Failed to list contacts: ${error.message}`);
    }
};



const createContact = async (userId, { givenName, familyName, email, phone }) => {
    console.log(`[Contacts] Creating contact: ${givenName} ${familyName}`);
    try {
        const people = await getPeopleClient(userId);
        const res = await people.people.createContact({
            requestBody: {
                names: [{ givenName, familyName }],
                emailAddresses: email ? [{ value: email }] : undefined,
                phoneNumbers: phone ? [{ value: phone }] : undefined,
            },
        });
        console.log(`[Contacts] Contact created: ${res.data.resourceName}`);
        return res.data;
    } catch (error) {
        console.error('[Contacts] Create Error:', error);
        throw new Error(`Failed to create contact: ${error.message}`);
    }
};

module.exports = { searchContacts, listContacts, createContact };
