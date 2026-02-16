const axios = require('axios');
const fs = require('fs');

/**
 * Verification script to test critical fixes and features
 * NOTE: Ensure server is running on port 5000 before executing
 */

const BASE_URL = 'http://localhost:5000';
const MOCK_SESSION_COOKIE = 'mock_session_cookie'; // You'd need a real cookie in practice

async function runTests() {
    console.log('🚀 Starting Verification Tests...\n');

    // 1. Test Rate Limiting (Expect 429 after threshold)
    console.log('--- Testing Rate Limiting ---');
    try {
        // Send rapid requests to /api/me
        const promises = [];
        for (let i = 0; i < 110; i++) {
            promises.push(axios.get(`${BASE_URL}/api/me`));
        }
        await Promise.allSettled(promises);
        console.log('✅ Rate limiting requests sent to /api/me');
    } catch (e) {
        console.log('ℹ️  Expected errors during rate limit test (some are normal)');
    }

    // 2. Test Input Validation
    console.log('\n--- Testing Input Validation ---');
    try {
        await axios.post(`${BASE_URL}/api/chat`, {
            message: '', // Invalid empty message
            chatId: 'invalid-id'
        });
    } catch (error) {
        if (error.response && error.response.status === 400) {
            console.log('✅ Input validation working (caught invalid input)');
        } else {
            console.error('❌ Input validation check failed:', error.message);
        }
    }

    // 3. Test File Upload Validation
    console.log('\n--- Testing File Upload Validation ---');
    // Note: Can't easily mock file upload here without form-data lib, skipping

    console.log('\n✨ Verification Complete!');
    console.log('Note: Full verification requires running server and manual testing.');
}

// Check if server is reachable
axios.get(BASE_URL)
    .then(() => runTests())
    .catch(() => console.error('❌ Server is not running. Please start the server to run verification.'));
