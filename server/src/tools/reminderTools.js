const Reminder = require('../models/Reminder');

const createReminder = async (userId, { text, dueDateTime }) => {
    const reminder = new Reminder({
        userId,
        text,
        dueDateTime,
    });
    await reminder.save();
    return reminder;
};

const listReminders = async (userId, { isCompleted }) => {
    const query = { userId };
    if (isCompleted !== undefined) {
        query.isCompleted = isCompleted;
    }
    return await Reminder.find(query).sort({ dueDateTime: 1 });
};

const deleteReminder = async (userId, { reminderId }) => {
    await Reminder.findOneAndDelete({ _id: reminderId, userId });
    return { success: true };
};

module.exports = { createReminder, listReminders, deleteReminder };
