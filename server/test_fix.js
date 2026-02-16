console.log("--- Testing Sequence-Aware Sanitization Logic ---");

const testConversation = [
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Calling tool...', tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'test', arguments: '{}' } }] },
    { role: 'user', content: 'Wait, forget about that.' } // Note: tool message is MISSING here (e.g. filtered history)
];

const sanitize = (conversation) => {
    return conversation.map((msg, idx) => {
        const sanitized = {
            role: msg.role,
            content: msg.content || ""
        };
        if (msg.role === 'assistant' && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
            const nextMsg = conversation[idx + 1];
            if (nextMsg && nextMsg.role === 'tool') {
                sanitized.tool_calls = msg.tool_calls;
            } else {
                console.log(`[Test] Correctly stripping orphaned tool_calls at index ${idx}`);
            }
        }
        return sanitized;
    });
};

const result = sanitize(testConversation);
console.log("Sanitized Conversation:", JSON.stringify(result, null, 2));

const hasOrphanedToolCalls = result.some((m, i) => m.tool_calls && (!testConversation[i + 1] || testConversation[i + 1].role !== 'tool'));

if (!hasOrphanedToolCalls) {
    console.log("Success: Sequence validation passed. Orphaned tool_calls were stripped.");
} else {
    console.error("Failure: Orphaned tool_calls still present!");
    process.exit(1);
}
