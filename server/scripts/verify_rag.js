const memoryService = require('../src/services/memory');

const runVerification = async () => {
    try {
        console.log("Initializing Memory Service...");
        await memoryService.init();

        console.log("Adding test message...");
        await memoryService.addMessage('user', 'My favorite color is green', 'test-user', 'test-chat');

        console.log("Searching for context...");
        const results = await memoryService.searchContext('What is my favorite color?', 'test-user');

        console.log("Results found:", results.length);
        if (results.length > 0) {
            console.log("First result:", results[0].text);
            if (results[0].text.includes('green')) {
                console.log("SUCCESS: RAG Memory Verification Passed!");
            } else {
                console.log("FAILURE: Retrieved unrelated context.");
            }
        } else {
            console.log("FAILURE: No context retrieved.");
        }

    } catch (error) {
        console.error("Verification Error:", error);
    }
};

runVerification();
