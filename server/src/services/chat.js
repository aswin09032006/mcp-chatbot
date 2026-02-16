const mcpClient = require('./mcpClient');
const OpenAI = require('openai');

const client = new OpenAI({
    apiKey: process.env.GITHUB_TOKEN,
    baseURL: process.env.GITHUB_MODELS_ENDPOINT || 'https://models.github.ai/inference'
});

/**
 * Sanitize model mapping for GitHub Marketplace
 */
const sanitizeModelName = (modelId) => {
    // If it's one of the known GitHub models, return as is
    const validModels = ['gpt-4o', 'gpt-4o-mini', 'o1', 'o1-mini', 'o1-preview', 'o3-mini'];
    if (validModels.includes(modelId)) return modelId;

    // Fallback mapping for custom or legacy names
    if (modelId.includes('120b') || modelId.includes('70b') || modelId.includes('versatile')) return 'gpt-4o';
    if (modelId.includes('20b') || modelId.includes('8b') || modelId.includes('instant')) return 'gpt-4o-mini';

    return process.env.LLM_MODEL || 'gpt-4o';
};

// Constants
const MAX_TOOL_ITERATIONS = 10; // Prevent infinite tool calling loops
const MAX_CONTEXT_MESSAGES = 100; // Increased context for GPT-4o

/**
 * Handle execution of a tool call via MCP
 */
const handleToolCall = async (userId, toolCall, chatId = null) => {
    const name = toolCall.function.name;
    let args;
    try {
        args = JSON.parse(toolCall.function.arguments);
    } catch (e) {
        throw new Error(`Invalid JSON arguments for tool ${name}`);
    }

    console.log(`[MCP Tool] ${name} called with:`, JSON.stringify(args));

    // Inject userId into arguments for the MCP server
    // (The server schemas expect userId for most tools)
    const mcpArgs = { ...args, userId };

    // Inject chatId for schedule_task to know where to post results
    if (name === 'schedule_task' && chatId) {
        mcpArgs.chatId = chatId;
        console.log(`[MCP Tool] Injecting chatId ${chatId} for schedule_task`);
    }

    return await mcpClient.callTool(name, mcpArgs);
};

const chat = async (userId, messages, modelOption, attachments = [], chatId = null) => {
    const model = sanitizeModelName(modelOption || process.env.LLM_MODEL || 'gpt-4o');
    let conversation = [...messages];

    // Inject attachments if present
    if (attachments && attachments.length > 0) {
        const lastMsg = conversation[conversation.length - 1];
        if (lastMsg.role === 'user') {
            const context = attachments.map(f => `[File: ${f.filename}]\n${f.text}`).join('\n\n');
            lastMsg.content = `Context from attached files:\n${context}\n\nUser Message:\n${lastMsg.content}`;
        }
    }

    // Smart Context Management
    if (conversation.length > MAX_CONTEXT_MESSAGES) {
        const systemMessage = conversation.find(m => m.role === 'system');
        const recentMessages = conversation.slice(-MAX_CONTEXT_MESSAGES);
        conversation = [
            ...(systemMessage ? [systemMessage] : []),
            ...recentMessages
        ];
        console.log(`[Context] Truncated history to ${conversation.length} messages`);
    }

    // Load available tools from MCP Client
    const tools = await mcpClient.getTools();

    let trace = [];
    trace.push({ type: 'step', name: 'Processing Request', status: 'pending', timestamp: new Date() });

    const sanitizedConversation = conversation.map((msg, idx) => {
        const sanitized = {
            role: msg.role,
            content: msg.content || ""
        };

        // Only include tool-related fields for assistant if followed by tool results
        if (msg.role === 'assistant' && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
            // Strict check: OpenAI/GitHub API requires tool_calls to be followed by tool messages.
            // When history is loaded/filtered from DB, tool messages might be missing.
            const nextMsg = conversation[idx + 1];
            if (nextMsg && nextMsg.role === 'tool') {
                sanitized.tool_calls = msg.tool_calls;
            } else {
                console.log(`[Chat] Stripping tool_calls from assistant message at index ${idx} to avoid 400 error (no following tool responses)`);
            }
        }
        if (msg.role === 'tool') {
            sanitized.tool_call_id = msg.tool_call_id;
            sanitized.name = msg.name;
        }

        return sanitized;
    });

    // Add system message at the beginning (only for API, not saved to DB)
    const systemMessage = {
        role: 'system',
        content: `You are a helpful AI assistant with access to various tools and capabilities.

IMPORTANT GUIDELINES:
1. When a tool call fails, DO NOT repeat the error message verbatim to the user.
2. Instead, acknowledge the issue briefly and either:
   - Try an alternative approach
   - Ask the user for clarification if needed
   - Explain what went wrong in simple terms
3. If a task succeeds after retrying, focus on the success, not the failed attempts.
4. Always be concise and user-friendly in your responses.
5. **Repository Analysis**: When researching a repository, always start by reading the README using get_repository_readme. For deeper analysis, explore the structure with list_repository_files and read specific source files with get_file_contents.

Available capabilities:
- Schedule tasks to run automatically
- Check emails and calendar
- Search the web and fetch content
- Manage your Google Workspace
- Remember context from previous conversations
- **Plan complex tasks**: Use the \`plan_task\` tool to break down multi-step requests before execution.
- **GitHub Mastery**: You have direct agency over GitHub using the user's personal token. Use tools like \`list_user_repositories\`, \`list_issues\`, and \`create_pull_request\` to assist with engineering tasks.
- **Database Analysis**: You can query and analyze SQL databases using the \`query_database\` tool.

AGENTIC REASONING GUIDELINES:
1. If a user request involves multiple distinct steps (e.g., "Research X, then write a summary in a Google Doc, then email it to Y"), ALWAYS start by calling \`plan_task\`.
2. NEVER ask the user for a GitHub token or database credentials if they ask you to perform an action. Simply try using the tool first. If it fails with a "token not found" error, then politely guide them to the Settings page.
3. This provides the user with transparency into your "thinking" and ensuring higher accuracy during execution.`
    };
    sanitizedConversation.unshift(systemMessage);

    let response;
    try {
        response = await client.chat.completions.create({
            messages: sanitizedConversation,
            model: model,
            tools: tools.length > 0 ? tools : undefined,
            tool_choice: tools.length > 0 ? "auto" : "none"
        });
    } catch (error) {
        // Handle specific tool validation errors by retrying without tools
        if (error.status === 400 && error.error?.error?.code === 'tool_use_failed') {
            console.warn("Tool use failed (hallucination), retrying without tools...");
            trace.push({ type: 'error', name: 'Tool Error', details: 'Retrying without tools' });
            response = await client.chat.completions.create({
                messages: conversation,
                model: model
            });
        } else {
            throw error;
        }
    }

    let responseMessage = response.choices[0].message;

    // Tool calling loop
    let toolIterations = 0;
    while (responseMessage.tool_calls && toolIterations < MAX_TOOL_ITERATIONS) {
        toolIterations++;
        console.log(`[Tool Iteration ${toolIterations}/${MAX_TOOL_ITERATIONS}]`);

        conversation.push(responseMessage);

        for (const toolCall of responseMessage.tool_calls) {
            trace.push({ type: 'tool_start', name: toolCall.function.name, args: toolCall.function.arguments, timestamp: new Date() });

            try {
                const toolResult = await handleToolCall(userId, toolCall, chatId);
                trace.push({ type: 'tool_end', name: toolCall.function.name, result: 'Success', timestamp: new Date() });

                conversation.push({
                    tool_call_id: toolCall.id,
                    role: "tool",
                    name: toolCall.function.name,
                    content: JSON.stringify(toolResult),
                });
            } catch (error) {
                trace.push({ type: 'tool_error', name: toolCall.function.name, error: error.message, timestamp: new Date() });
                console.error(`Tool execution error for ${toolCall.function.name}:`, error);

                conversation.push({
                    tool_call_id: toolCall.id,
                    role: "tool",
                    name: toolCall.function.name,
                    content: JSON.stringify({ error: error.message }),
                });
            }
        }

        if (toolIterations >= MAX_TOOL_ITERATIONS) {
            console.warn('⚠️  Max tool iterations reached, stopping tool calls');
            break;
        }

        const nextRequestMessages = conversation.map((msg, idx) => {
            const sanitized = {
                role: msg.role,
                content: msg.content || ""
            };
            if (msg.role === 'assistant' && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
                const nextMsg = conversation[idx + 1];
                if (nextMsg && nextMsg.role === 'tool') {
                    sanitized.tool_calls = msg.tool_calls;
                }
            }
            if (msg.role === 'tool') {
                sanitized.tool_call_id = msg.tool_call_id;
                sanitized.name = msg.name;
            }
            return sanitized;
        });

        response = await client.chat.completions.create({
            messages: nextRequestMessages,
            model: model,
            tools: tools,
            tool_choice: "auto"
        });

        responseMessage = response.choices[0].message;
    }

    trace.push({ type: 'complete', name: 'Response Generated', timestamp: new Date() });

    return { content: responseMessage.content, trace };
};

const Chat = require('../models/Chat');
const memoryService = require('./memory');

/**
 * Handle streaming chat execution
 */
const chatStream = async (userId, messages, modelOption, attachments = [], res, chatId = null) => {
    const model = sanitizeModelName(modelOption || process.env.LLM_MODEL || 'gpt-4o');

    // Ensure memory service is initialized
    if (!memoryService.initialized) await memoryService.init();

    // --- Persistence Setup ---
    let chatDoc;
    let isNewChat = false;

    // Determine the user message to save (the last one)
    const incomingUserMessage = messages[messages.length - 1];
    if (incomingUserMessage.role !== 'user') {
        console.warn("Last message is not user, persistence might be tricky");
    }

    try {
        if (chatId) {
            chatDoc = await Chat.findOne({ _id: chatId, userId });
        }

        if (!chatDoc) {
            isNewChat = true;
            // Create new chat
            const title = incomingUserMessage.content.slice(0, 50) + (incomingUserMessage.content.length > 50 ? '...' : '');
            chatDoc = new Chat({
                userId,
                title,
                messages: []
            });
            await chatDoc.save();
            chatId = chatDoc._id; // Update chatId for valid reference
        }

        // Save User Message
        const userMsgToSave = {
            role: 'user',
            content: incomingUserMessage.content,
            attachments: attachments || [],
            timestamp: new Date()
        };
        chatDoc.messages.push(userMsgToSave);
        chatDoc.lastMessageAt = new Date();
        await chatDoc.save();

    } catch (dbError) {
        console.error("Database persistence error (init):", dbError);
        // We continue even if DB fails, to at least respond
    }
    // -------------------------

    let conversation = [...messages];
    const lastUserMessage = conversation[conversation.length - 1];
    // Capture original content for memory storage (prior to RAG injection)
    const originalUserContent = lastUserMessage.role === 'user' ? lastUserMessage.content : null;

    // RAG: Retrieve Context
    let contextString = "";
    if (lastUserMessage.role === 'user') {
        const memoryResults = await memoryService.searchContext(lastUserMessage.content, userId);
        if (memoryResults && memoryResults.length > 0) {
            const facts = memoryResults.filter(r => r.type === 'fact');
            const history = memoryResults.filter(r => r.type === 'message');

            if (facts.length > 0) {
                contextString += "### Known Facts & Preferences:\n" +
                    facts.map(f => `- ${f.text}`).join('\n') + "\n\n";
            }

            if (history.length > 0) {
                contextString += "### Relevant Past Interactions:\n" +
                    history.map(h => `- ${h.text}`).join('\n') + "\n\n";
            }

            console.log(`RAG: Found ${facts.length} facts and ${history.length} history snippets.`);

            // Emit memory access event for visualization
            if (res && res.write) {
                const eventData = {
                    type: 'memory_access',
                    count: memoryResults.length,
                    fragments: memoryResults.map(r => ({
                        text: r.text ? r.text.substring(0, 50) + '...' : '[No text]',
                        score: r.score,
                        type: r.type
                    }))
                };
                try { res.write(`data: ${JSON.stringify(eventData)} \n\n`); } catch (e) { }
            }
        }
    }

    // Inject attachments & RAG Context
    if ((attachments && attachments.length > 0) || contextString) {
        if (lastUserMessage.role === 'user') {
            let combinedContext = "";
            if (contextString) combinedContext += `CONTEXT FROM MEMORY:\n${contextString}\n`;
            if (attachments && attachments.length > 0) {
                const fileContext = attachments.map(f => `[File: ${f.filename}]\n${f.text} `).join('\n\n');
                combinedContext += `CONTEXT FROM ATTACHMENTS:\n${fileContext}\n`;
            }

            lastUserMessage.content = `${combinedContext}\nUSER MESSAGE:\n${lastUserMessage.content}`;
        }
    }

    // Smart Context Management
    if (conversation.length > MAX_CONTEXT_MESSAGES) {
        const systemMessage = conversation.find(m => m.role === 'system');
        const recentMessages = conversation.slice(-MAX_CONTEXT_MESSAGES);
        conversation = [
            ...(systemMessage ? [systemMessage] : []),
            ...recentMessages
        ];
    }

    // Load available tools
    const tools = await mcpClient.getTools();

    // Set headers for SSE if not already set
    if (!res.headersSent) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
    }

    // Track client connection status
    let clientDisconnected = false;
    res.on('close', () => {
        clientDisconnected = true;
        console.log('[Chat] Client disconnected, continuing processing in background...');
    });

    const sendEvent = (data) => {
        if (!clientDisconnected) {
            try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch (e) {
                console.error("Error writing to stream", e);
                clientDisconnected = true;
            }
        }
    };

    // Notify client of new chat ID immediately
    if (isNewChat) {
        sendEvent({ type: 'chat_created', chatId: chatDoc._id, title: chatDoc.title });
    }

    let toolIterations = 0;
    let trace = [];

    // Main Tool Loop
    while (toolIterations < MAX_TOOL_ITERATIONS) {
        toolIterations++;

        const sanitizedConversation = conversation.map((msg, idx) => {
            const sanitized = {
                role: msg.role,
                content: msg.content || ""
            };

            // Only include tool-related fields for assistant if followed by tool results
            if (msg.role === 'assistant' && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
                const nextMsg = conversation[idx + 1];
                if (nextMsg && nextMsg.role === 'tool') {
                    sanitized.tool_calls = msg.tool_calls;
                }
            }
            if (msg.role === 'tool') {
                sanitized.tool_call_id = msg.tool_call_id;
                sanitized.name = msg.name;
            }

            return sanitized;
        });

        // Inject System Message
        const systemMessage = {
            role: 'system',
            content: `You are a helpful AI assistant with access to various tools and capabilities.

IMPORTANT GUIDELINES:
1. When a tool call fails, DO NOT repeat the error message verbatim to the user.
2. Instead, acknowledge the issue briefly and either:
   - Try an alternative approach
   - Ask the user for clarification if needed
   - Explain what went wrong in simple terms
3. If a task succeeds after retrying, focus on the success, not the failed attempts.
4. Always be concise and user-friendly in your responses.

Available capabilities:
- Schedule tasks to run automatically
- Check emails and calendar
- Search the web and fetch content
- Manage your Google Workspace
- Remember context from previous conversations
- **Plan complex tasks**: Use the \`plan_task\` tool to break down multi-step requests before execution.
- **GitHub Mastery**: You have direct agency over GitHub using the user's personal token. Use tools like \`list_user_repositories\`, \`list_issues\`, and \`create_pull_request\` to assist with engineering tasks.
- **Database Analysis**: You can query and analyze SQL databases using the \`query_database\` tool.

AGENTIC REASONING GUIDELINES:
1. If a user request involves multiple distinct steps (e.g., "Research X, then write a summary in a Google Doc, then email it to Y"), ALWAYS start by calling \`plan_task\`.
2. NEVER ask the user for a GitHub token or database credentials if they ask you to perform an action. Simply try using the tool first. If it fails with a "token not found" error, then politely guide them to the Settings page.
3. This provides the user with transparency into your "thinking" and ensuring higher accuracy during execution.`
        };
        sanitizedConversation.unshift(systemMessage);

        const nextRequestMessages = sanitizedConversation;

        let toolCalls = [];
        let currentContent = '';

        try {
            const stream = await client.chat.completions.create({
                messages: nextRequestMessages,
                model: model,
                tools: tools.length > 0 ? tools : undefined,
                tool_choice: tools.length > 0 ? "auto" : "none",
                stream: true
            });

            for await (const chunk of stream) {
                const delta = chunk.choices[0]?.delta;

                if (delta?.content) {
                    currentContent += delta.content;
                    sendEvent({ type: 'content', delta: delta.content });
                }

                if (delta?.tool_calls) {
                    for (const toolCall of delta.tool_calls) {
                        const index = toolCall.index;
                        if (!toolCalls[index]) {
                            toolCalls[index] = {
                                id: toolCall.id,
                                type: toolCall.type,
                                function: { name: "", arguments: "" }
                            };
                        }
                        if (toolCall.function?.name) toolCalls[index].function.name += toolCall.function.name;
                        if (toolCall.function?.arguments) toolCalls[index].function.arguments += toolCall.function.arguments;
                    }
                }
            }

            // After stream finishes, check for artifacts in the content
            const artifactRegex = /```(\w+)\s*\n\/\/\s*artifact:\s*(.*)\n([\s\S]*?)```/g;
            let match;
            while ((match = artifactRegex.exec(currentContent)) !== null) {
                const [_, language, title, content] = match;
                sendEvent({
                    type: 'artifact',
                    artifact: {
                        title: title.trim(),
                        language: language.trim(),
                        content: content.trim()
                    }
                });
            }

            // Append assistant message to conversation
            const assistantMessage = {
                role: 'assistant',
                content: currentContent || null,
                tool_calls: toolCalls.length > 0 ? toolCalls : undefined
            };
            conversation.push(assistantMessage);

            // Save Assistant Message (or intermediate tool call step) to DB
            // NOTE: We typically only save the final assistant response or significant steps.
            // For simplicity and correctness, we should save each assistant response in the chain.
            if (chatDoc) {
                const msgToSave = {
                    role: 'assistant',
                    content: assistantMessage.content || '',
                    tool_calls: assistantMessage.tool_calls,
                    timestamp: new Date()
                };
                chatDoc.messages.push(msgToSave);
                await chatDoc.save();
            }

            // If no tool calls, we are done
            if (toolCalls.length === 0) {
                break;
            }

            // Handle Tool Calls
            for (const toolCall of toolCalls) {
                const toolName = toolCall.function.name;
                const toolArgsStr = toolCall.function.arguments;

                sendEvent({ type: 'tool_start', tool: toolName, args: toolArgsStr });
                trace.push({ type: 'tool_start', name: toolName, args: toolArgsStr, timestamp: new Date() });

                // We might want to save tool usage to DB too? 
                // Currently schema doesn't support 'tool' role explicitly in a structured way besides raw content.
                // Let's skip saving tool inputs/outputs to main history for now to keep it clean, 
                // OR save them if we want full fidelity.
                // Let's stick to saving the conversation flow as the user sees it (User -> Assistant).

                try {
                    const result = await handleToolCall(userId, toolCall, chatId);

                    sendEvent({ type: 'tool_result', tool: toolName, result });
                    trace.push({ type: 'tool_end', name: toolName, result: 'Success', timestamp: new Date() });

                    conversation.push({
                        tool_call_id: toolCall.id,
                        role: "tool",
                        name: toolName,
                        content: JSON.stringify(result) || ''
                    });

                    // Save Tool Result to DB
                    if (chatDoc) {
                        chatDoc.messages.push({
                            role: 'tool',
                            tool_call_id: toolCall.id,
                            name: toolName,
                            content: JSON.stringify(result) || '',
                            timestamp: new Date()
                        });
                        await chatDoc.save();
                    }
                } catch (error) {
                    console.error(`Tool error(${toolName}): `, error);

                    // Create user-friendly error message
                    let userFriendlyError = `I encountered an issue while trying to ${toolName.replace(/_/g, ' ')} `;

                    // Add specific context if available
                    if (error.message && !error.message.includes('expected')) {
                        userFriendlyError += `: ${error.message} `;
                    } else if (error.message && error.message.includes('expected')) {
                        // Validation error - make it friendly
                        userFriendlyError += '. Please try rephrasing your request.';
                    }

                    sendEvent({ type: 'tool_error', tool: toolName, error: userFriendlyError });
                    trace.push({ type: 'tool_error', name: toolName, error: userFriendlyError, timestamp: new Date() });

                    conversation.push({
                        tool_call_id: toolCall.id,
                        role: "tool",
                        name: toolName,
                        content: userFriendlyError
                    });
                    // Save Tool Error to DB
                    if (chatDoc) {
                        chatDoc.messages.push({
                            role: 'tool',
                            tool_call_id: toolCall.id,
                            name: toolName,
                            content: userFriendlyError,
                            timestamp: new Date()
                        });
                        await chatDoc.save();
                    }
                }
            }

        } catch (error) {
            console.error("Stream error:", error);
            sendEvent({ type: 'error', message: error.message });
            break;
        }
    }

    // Save to Memory (RAG)
    if (userId) {
        // Save original user message
        if (originalUserContent) {
            await memoryService.addMessage('user', originalUserContent, userId);
        }

        const finalMsg = conversation[conversation.length - 1];
        if (finalMsg.role === 'assistant' && finalMsg.content) {
            await memoryService.addMessage('assistant', finalMsg.content, userId);

            // --- Background Fact Extraction ---
            // Perform a hidden second pass to extract structured facts
            try {
                const extractionPrompt = [
                    { role: 'system', content: 'You are a memory extraction engine. Analyze the recent conversation turn and extract 1-3 key facts about the user (preferences, relationships, goals, or important details). \n\nOutput ONLY a JSON array of objects: [{"text": "fact", "category": "category", "importance": 1-5}]. \nIf no new facts, output [].' },
                    { role: 'user', content: `User: ${originalUserContent}\nAssistant: ${finalMsg.content}` }
                ];

                const extractionResponse = await client.chat.completions.create({
                    messages: extractionPrompt,
                    model: 'gpt-4o-mini', // Use a smaller model for extraction
                    response_format: { type: 'json_object' }
                });

                const content = extractionResponse.choices[0].message.content;
                const data = JSON.parse(content);
                const facts = Array.isArray(data) ? data : (data.facts || []);

                for (const fact of facts) {
                    await memoryService.saveFact(fact.text, fact.category, userId, fact.importance);
                    // Emit extraction event for UI feedback
                    sendEvent({ type: 'fact_extracted', fact: fact.text });
                }
            } catch (e) {
                console.error("[Memory] Fact extraction failed:", e);
            }
        }
    }

    sendEvent({ type: 'done', trace: trace });
    res.end();
};

module.exports = { chat, chatStream };
