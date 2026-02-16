const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    googleId: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    name: {
        type: String,
    },
    picture: {
        type: String,
    },
    tokens: {
        access_token: String,
        refresh_token: String,
        scope: String,
        token_type: String,
        expiry_date: Number,
    },
    githubToken: String,
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('User', UserSchema);
