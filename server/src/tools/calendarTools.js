const { getCalendarClient } = require('../services/google');

const listEvents = async (userId, { timeMin, timeMax, maxResults = 10 }) => {
    console.log(`[Calendar] Listing events for user ${userId} from ${timeMin} to ${timeMax}`);
    try {
        const calendar = await getCalendarClient(userId);
        const res = await calendar.events.list({
            calendarId: 'primary',
            timeMin: timeMin || new Date().toISOString(),
            timeMax,
            maxResults,
            singleEvents: true,
            orderBy: 'startTime',
        });
        console.log(`[Calendar] Found ${res.data.items.length} events.`);
        return res.data.items;
    } catch (error) {
        console.error('[Calendar] List Events Error:', error);
        throw new Error(`Failed to list events: ${error.message}`);
    }
};

const createEvent = async (userId, { summary, description, start, end, attendees }) => {
    console.log(`[Calendar] Creating event for user ${userId}:`, { summary, start, end });

    // Check for conflicts
    try {
        const conflicts = await listEvents(userId, { timeMin: start, timeMax: end });
        if (conflicts && conflicts.length > 0) {
            console.warn(`[Calendar] Conflict detected for user ${userId}:`, conflicts.map(e => `${e.summary} (${e.start.dateTime} - ${e.end.dateTime})`));
            return {
                status: 'conflict',
                message: `Scheduling conflict: existing event(s) overlap with this time slot.`,
                conflicts: conflicts.map(e => ({
                    summary: e.summary,
                    start: e.start.dateTime || e.start.date,
                    end: e.end.dateTime || e.end.date
                }))
            };
        }
    } catch (e) {
        console.error(`[Calendar] Conflict check failed, proceeding with caution: ${e.message}`);
    }

    const calendar = await getCalendarClient(userId);

    // Ensure accurate timezone handling
    const event = {
        summary,
        description,
        start: {
            dateTime: start,
            timeZone: 'Asia/Kolkata'
        },
        end: {
            dateTime: end,
            timeZone: 'Asia/Kolkata'
        },
        attendees: attendees ? attendees.map(email => ({ email })) : [],
        conferenceData: {
            createRequest: {
                requestId: Math.random().toString(36).substring(7),
                conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
        },
    };

    try {
        const res = await calendar.events.insert({
            calendarId: 'primary',
            resource: event,
            conferenceDataVersion: 1,
        });

        console.log(`[Calendar] Event inserted. ID: ${res.data.id}, Status: ${res.data.status}, Link: ${res.data.htmlLink}`);

        // Verification step: Fetch the event to confirm it exists
        const verify = await calendar.events.get({
            calendarId: 'primary',
            eventId: res.data.id,
        });

        if (verify.status === 200) {
            console.log(`[Calendar] Verification successful for event ${res.data.id}`);
            return {
                status: 'success',
                message: 'Event scheduled and verified.',
                eventId: res.data.id,
                link: res.data.htmlLink,
                details: verify.data
            };
        } else {
            console.warn(`[Calendar] Verification failed for event ${res.data.id}`);
            return {
                status: 'warning',
                message: 'Event created but verification failed.',
                eventId: res.data.id
            };
        }
    } catch (error) {
        console.error('[Calendar] API Error:', error);
        throw new Error(`Google Calendar API Failed: ${error.message}`);
    }
};

const updateEvent = async (userId, { eventId, ...updates }) => {
    const calendar = await getCalendarClient(userId);
    // First fetch the event to preserve fields if needed, but patching is better
    const res = await calendar.events.patch({
        calendarId: 'primary',
        eventId,
        resource: updates,
    });
    return res.data;
};

const deleteEvent = async (userId, { eventId }) => {
    const calendar = await getCalendarClient(userId);
    await calendar.events.delete({
        calendarId: 'primary',
        eventId,
    });
    return { success: true };
};

module.exports = { listEvents, createEvent, updateEvent, deleteEvent };
