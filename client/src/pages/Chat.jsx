import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, Brain, CheckCircle, ChevronDown, Globe, Mic, Paperclip, Volume2, X, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import MessageBubble from '../components/MessageBubble';
import Toast from '../components/Toast';
import WorkspaceTabs from '../components/WorkspaceTabs';
import useSpeech from '../hooks/useSpeech';
import useNeuralLinkStore from '../store/neuralLinkStore';
import useTabsStore from '../store/tabsStore';

import { useNavigate, useParams } from 'react-router-dom';
import Capabilities from '../components/Capabilities';
import MemoryInspector from '../components/MemoryInspector';

const MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o', icon: Zap, description: 'Highest Intelligence' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', icon: Zap, description: 'Fast & Efficient' },
  { id: 'o1', name: 'o1', icon: Brain, description: 'Advanced Reasoning' },
  { id: 'o1-mini', name: 'o1-mini', icon: Brain, description: 'Fast Reasoning' },
];

const Chat = ({ user, onLogout }) => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [currentTrace, setCurrentTrace] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [isWorkspaceVisible, setIsWorkspaceVisible] = useState(false);
  const [rightPanelWidth, setRightPanelWidth] = useState(40);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  
  const { isListening, isSpeaking, lastTranscript, analyser, startListening, stopListening, speak, cancelSpeech } = useSpeech();
  const fileInputRef = useRef(null);
  const { createTab, activeTabId, tabs } = useTabsStore();
  const { isMemoryInspectorOpen, toggleMemoryInspector } = useNeuralLinkStore();
  const prevTabCountRef = useRef(tabs.length);

  const handleVoiceResult = (transcript) => {
    setInput((prev) => prev + (prev ? ' ' : '') + transcript);
  };

  // Auto-show workspace when NEW tabs are created (not on initial mount)
  useEffect(() => {
    if (tabs.length > prevTabCountRef.current && !isWorkspaceVisible) {
      setIsWorkspaceVisible(true);
    }
    prevTabCountRef.current = tabs.length;
  }, [tabs.length, isWorkspaceVisible]);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // File size validation (10MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
        showToast(`File too large. Maximum size is 10MB`, 'error');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        setIsLoading(true);
        const res = await axios.post('/api/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        setAttachments(prev => [...prev, res.data]);
        showToast(`Analyzed ${file.name}`, 'success');
    } catch (err) {
        console.error("Upload failed", err);
        showToast("Failed to analyze file", "error");
    } finally {
        setIsLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  
  // Load chat if chatId exists
  useEffect(() => {
    if (chatId) {
        setIsLoading(true);
        axios.get(`/api/chats/${chatId}`)
            .then(res => {
                setMessages(res.data.messages);
            })
            .catch(err => {
                console.error("Failed to load chat", err);
                showToast("Failed to load chat history", "error");
            })
            .finally(() => setIsLoading(false));
    } else {
        setMessages([]);
    }
  }, [chatId]);

  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const abortControllerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Listen for rate limit events
  useEffect(() => {
    const handleRateLimit = () => {
      showToast('You are sending messages too fast. Please slow down.', 'error');
      setIsLoading(false);
    };

    window.addEventListener('rate-limit-exceeded', handleRateLimit);
    return () => window.removeEventListener('rate-limit-exceeded', handleRateLimit);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
        setIsLoading(false);
    }
  };

  const handleEditMessage = (index) => {
    const messageToEdit = messages[index];
    if (!messageToEdit || messageToEdit.role !== 'user') return;

    const inputToEdit = messageToEdit.content;
    setInput(inputToEdit);
    if (messageToEdit.attachments) {
        setAttachments(messageToEdit.attachments);
    }
    setMessages(messages.slice(0, index));
    
    // Focus textarea
    setTimeout(() => {
        textareaRef.current?.focus();
    }, 100);
  };

  const handleMicClick = () => {
    if (isListening) {
        stopListening();
    } else {
        startListening(handleVoiceResult, (error) => {
            showToast(`Voice input error: ${error}`, 'error');
        });
    }
  };

  const handleChatWithPage = async () => {
    if (!activeTabId) return;

    try {
        if (window.api && window.api.extractContent) {
           const result = await window.api.extractContent(activeTabId);
           if (result.success) {
               // Add as a special attachment
               const pageContent = `Page Title: ${result.title}\nURL: ${result.url}\n\nContent:\n${result.content}`;
               setAttachments(prev => [...prev, { 
                   filename: "Current Page", 
                   text: pageContent,
                   size: pageContent.length 
               }]);
               showToast('Page content added to context', 'success');
           } else {
               showToast('Failed to extract page content', 'error');
           }
        } else {
            showToast('Browser API not available', 'error');
        }
    } catch (error) {
        console.error('Page extract error:', error);
        showToast('Failed to extract page content', 'error');
    }
  };

  const executeChat = async (currentHistory, currentAttachments = []) => {
    setIsLoading(true);
    // Determine user message (for optimistic update, though usually already added)
    const userMessage = currentHistory[currentHistory.length - 1];

    // Check for special commands
    if (userMessage.content.trim() === '/reload-tools') {
        try {
            const res = await axios.post('/api/chat/tools/reload');
            if (res.data.success) {
                showToast(`Tools reloaded. Total: ${res.data.count}`, 'success');
                // Remove the command message from UI
                setMessages(prev => prev.slice(0, -1));
            } else {
                showToast('Failed to reload tools', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Failed to reload tools', 'error');
        }
        setIsLoading(false);
        return;
    }

    // Cancel any previous pending request
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: currentHistory[currentHistory.length - 1].content, // Send last message as 'message' for legacy support
                chatId: chatId,
                history: currentHistory,
                model: selectedModel.id,
                attachments: currentAttachments
            }),
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantMessage = { role: 'assistant', content: '' };
        
        // Add placeholder assistant message
        setMessages(prev => [...prev, assistantMessage]);

        let collectedTrace = [];

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));

                        if (data.type === 'content') {
                            assistantMessage.content += data.delta;
                            setMessages(prev => {
                                const newPrev = [...prev];
                                // Update the last message (which is the assistant message we added)
                                newPrev[newPrev.length - 1] = { ...assistantMessage };
                                return newPrev;
                            });
                        } else if (data.type === 'tool_start') {
                            console.log('Tool Start:', data.tool);
                            // Neural Link Animation
                            const { activateNode, emitSignal, addLog } = useNeuralLinkStore.getState();
                            const toolName = data.tool;
                            let target = 'brain';
                            if (toolName.startsWith('gmail') || toolName.startsWith('calendar')) target = 'google';
                            else if (toolName.startsWith('browser') || toolName.startsWith('open') || toolName.startsWith('read') || toolName.startsWith('click')) target = 'browser';
                            else if (toolName.startsWith('schedule') || toolName.startsWith('list_tasks') || toolName.startsWith('delete_task')) target = 'brain'; 
                            else if (toolName.startsWith('echo')) target = 'echo';

                            activateNode('brain');
                            activateNode(target);
                            emitSignal('brain', target);
                            addLog(`Calling ${toolName}...`);

                        } else if (data.type === 'chat_created') {
                             console.log('Chat Created:', data.chatId);
                             // Update URL without reloading if we are starting a new chat
                             // Check if we are already on this chat to avoid loop (though unlikely)
                             if (window.location.pathname !== `/c/${data.chatId}`) {
                                navigate(`/c/${data.chatId}`, { replace: true });
                             }
                        } else if (data.type === 'tool_result') {
                            console.log('Tool Result:', data.tool);

                            // Capture Thinking Plan
                            if (data.tool === 'plan_task') {
                                try {
                                    const planText = data.result.content?.[0]?.text;
                                    if (planText) {
                                        setMessages(prev => {
                                            const newPrev = [...prev];
                                            const lastMsg = newPrev[newPrev.length - 1];
                                            if (lastMsg.role === 'assistant') {
                                                newPrev[newPrev.length - 1] = { ...lastMsg, plan: planText };
                                            }
                                            return newPrev;
                                        });
                                    }
                                } catch (e) { console.error('Plan parse error', e); }
                            }
                            // Neural Link Animation
                            const { activateNode, emitSignal, addLog } = useNeuralLinkStore.getState();
                            const toolName = data.tool;
                            let source = 'brain';
                            if (toolName.startsWith('gmail') || toolName.startsWith('calendar')) source = 'google';
                            else if (toolName.startsWith('browser') || toolName.startsWith('open') || toolName.startsWith('read')) source = 'browser';
                            else if (toolName.startsWith('schedule') || toolName.startsWith('list_tasks') || toolName.startsWith('delete_task')) source = 'brain';
                            else if (toolName.startsWith('echo')) source = 'echo';

                            activateNode(source);
                            emitSignal(source, 'brain');
                            addLog(`Received Data from ${source}`);
                        } else if (data.type === 'memory_access') {
                            // Holographic Memory Trigger
                            console.log('Memory Access:', data.count);
                            const { activateNode, emitSignal, addLog } = useNeuralLinkStore.getState();
                            activateNode('brain');
                            addLog(`Recalled ${data.count} memories`);
                        } else if (data.type === 'artifact') {
                            console.log('Artifact Received:', data.artifact);
                            const { addArtifact } = useArtifactsStore.getState();
                            const { setWorkspaceView } = useNeuralLinkStore.getState();
                            
                            addArtifact(data.artifact);
                            setWorkspaceView('artifacts');
                            setIsWorkspaceVisible(true);
                            showToast(`Created Artifact: ${data.artifact.title}`, 'success');
                        } else if (data.type === 'done') {
                            if (data.trace) {
                                collectedTrace = data.trace;
                            }
                        } else if (data.type === 'error') {
                            showToast(data.message, 'error');
                        }
                    } catch (e) {
                        console.error('Error parsing SSE data', e);
                    }
                }
            }
        }
        
        // Stream finished. logic for tool side effects and auto-replies
        if (collectedTrace.length > 0) {
            // Update trace state
            setCurrentTrace(collectedTrace);
            
            // Handle Side Effects
            const nextAction = await handleToolSideEffects(collectedTrace);
            
            // If the tool side effect returns a message (autoSend), recursively call executeChat
            if (nextAction) {
                const autoMsg = { role: 'user', content: nextAction };
                // Update UI first
                setMessages(prev => [...prev, autoMsg]);
                // Recursive call with updated history (assistant msg + new user msg)
                const nextHistory = [...currentHistory, assistantMessage, autoMsg];
                await executeChat(nextHistory, []);
            }
        }

        // If we didn't have a chatId before, we might need to handle creation (usually backend returns it in headers or data)
        // For streaming, we might need a separate event for 'chat_created'. 
        // Assuming chatId is handled via URL or persists.

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log("Generation stopped by user");
      } else {
        console.error('Chat error:', error);
        showToast('Failed to send message', 'error');
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const newMessages = [...messages, { role: 'user', content: input, attachments: [...attachments] }];
    setMessages(newMessages);
    setInput('');
    setAttachments([]);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    await executeChat(newMessages, attachments);
  };

  const handleToolSideEffects = async (trace) => {
      let autoResponseMessage = null;

      const openUrlCall = trace?.find(t => t.type === 'tool_start' && t.name === 'open_url');
      const searchWebCall = trace?.find(t => t.type === 'tool_start' && t.name === 'search_web');
      const readTabCall = trace?.find(t => t.type === 'tool_start' && t.name === 'read_tab');
      const clickElementCall = trace?.find(t => t.type === 'tool_start' && t.name === 'click_web_element');
      const typeInputCall = trace?.find(t => t.type === 'tool_start' && t.name === 'type_web_input');
      const scrollPageCall = trace?.find(t => t.type === 'tool_start' && t.name === 'scroll_web_page');
      const getStructureCall = trace?.find(t => t.type === 'tool_start' && t.name === 'get_page_structure');
      
      const browserSearchCall = trace?.find(t => t.type === 'tool_start' && t.name === 'browser_search');
      const browserExtractCall = trace?.find(t => t.type === 'tool_start' && t.name === 'browser_extract_content');
      const browserScreenshotCall = trace?.find(t => t.type === 'tool_start' && t.name === 'browser_screenshot');
      const browserHighlightCall = trace?.find(t => t.type === 'tool_start' && t.name === 'browser_highlight_text');

      const openCalendarCall = trace?.find(t => t.type === 'tool_start' && t.name === 'open_calendar');
      const openGmailCall = trace?.find(t => t.type === 'tool_start' && t.name === 'open_gmail');
      const openDriveCall = trace?.find(t => t.type === 'tool_start' && t.name === 'open_drive');

      if (openUrlCall) {
          try {
              const args = JSON.parse(openUrlCall.args);
              if (args.url) createTab(args.url, args.title || 'New Tab');
          } catch (e) { console.error("open_url args parse failed", e); }
      }

      if (openCalendarCall) createTab('https://calendar.google.com', 'Google Calendar');
      if (openGmailCall) createTab('https://mail.google.com', 'Gmail');
      if (openDriveCall) createTab('https://drive.google.com', 'Google Drive');

      if (searchWebCall) {
          try {
              const args = JSON.parse(searchWebCall.args);
              if (args.query && window.api) {
                  window.api.searchWeb(args.query);
                  showToast(`Searching for "${args.query}"...`, 'success');
              }
          } catch (e) { console.error("search_web args parse failed", e); }
      }

      if (readTabCall) {
          try {
              const args = JSON.parse(readTabCall.args);
              const tabIdToRead = args.tabId || activeTabId;
              if (tabIdToRead && window.api) {
                  const result = await window.api.readTabContent(tabIdToRead);
                  if (result?.content) {
                      showToast(`Synthesizing page content...`, 'success');
                      autoResponseMessage = `Here is the content from the page "${result.title}":\n\n${result.content}`;
                  }
              }
          } catch (e) { console.error("read_tab execution failed", e); }
      }

      if (clickElementCall) {
        try {
            const args = JSON.parse(clickElementCall.args);
            const tid = args.tabId || activeTabId;
            if (tid && args.selector && window.api) {
                const res = await window.api.clickElement(tid, args.selector);
                showToast(res.message, res.success ? 'success' : 'error');
                if (res.success) autoResponseMessage = `Successfully clicked "${args.selector}". What should I do next?`;
            }
        } catch (e) { console.error("click execution failed", e); }
      }

      if (typeInputCall) {
        try {
            const args = JSON.parse(typeInputCall.args);
            const tid = args.tabId || activeTabId;
            if (tid && args.selector && window.api) {
                const res = await window.api.typeInElement(tid, args.selector, args.text);
                showToast(res.message, res.success ? 'success' : 'error');
                if (res.success) autoResponseMessage = `Successfully typed "${args.text}" into "${args.selector}". Should I submit it?`;
            }
        } catch (e) { console.error("type execution failed", e); }
      }

      if (scrollPageCall) {
        try {
            const args = JSON.parse(scrollPageCall.args);
            const tid = args.tabId || activeTabId;
            if (tid && window.api) {
                await window.api.scrollTab(tid, args.direction);
                showToast(`Scrolled ${args.direction}`, 'success');
            }
        } catch (e) { console.error("scroll execution failed", e); }
      }

      if (getStructureCall) {
        try {
            const args = JSON.parse(getStructureCall.args);
            const tid = args.tabId || activeTabId;
            if (tid && window.api) {
                const struct = await window.api.getPageStructure(tid);
                if (struct) {
                    showToast(`Page structure analyzed`, 'success');
                    const elements = struct.interactives.map(i => `[${i.tag}] "${i.text}" -> ${i.selector}`).join('\n');
                    autoResponseMessage = `I analyzed the page "${struct.title}". Here are some interactive elements I found:\n\n${elements}\n\nWhat should I interact with?`;
                }
            }
        } catch (e) { console.error("structure analysis failed", e); }
      }

      if (browserExtractCall) {
        try {
            const args = JSON.parse(browserExtractCall.args);
            const tid = args.tabId || activeTabId;
            if (tid && window.api) {
                const extracted = await window.api.extractContent(tid);
                if (extracted && extracted.success) {
                    showToast(`Extracted content from "${extracted.title}"`, 'success');
                    try {
                        await axios.post('/api/browsing-history', {
                            url: extracted.url,
                            title: extracted.title,
                            content: extracted.content,
                            excerpt: extracted.excerpt,
                            chatId: chatId,
                            metadata: {
                                byline: extracted.byline,
                                siteName: extracted.siteName,
                                publishedTime: extracted.publishedTime,
                                headings: extracted.headings
                            }
                        });
                    } catch (historyError) { }
                    
                    autoResponseMessage = `I extracted the following content from "${extracted.title}" (${extracted.url}):\n\n` +
                        `Author: ${extracted.byline || 'Unknown'}\n` +
                        `Published: ${extracted.publishedTime || 'Unknown'}\n\n` +
                        `Content Preview:\n${extracted.content.substring(0, 2000)}...\n\n` +
                        `What would you like to know about this article?`;
                } else {
                    showToast('Content extraction failed', 'error');
                }
            }
        } catch (e) { console.error("browser_extract_content failed", e); }
      }

      if (browserScreenshotCall) {
        try {
            const args = JSON.parse(browserScreenshotCall.args);
            const tid = args.tabId || activeTabId;
            if (tid && window.api) {
                const screenshot = await window.api.captureScreenshot(tid);
                if (screenshot && screenshot.success) {
                    showToast(`Screenshot captured: ${screenshot.filename}`, 'success');
                } else {
                    showToast('Screenshot capture failed', 'error');
                }
            }
        } catch (e) { console.error("browser_screenshot failed", e); }
      }

      if (browserHighlightCall) {
        try {
            const args = JSON.parse(browserHighlightCall.args);
            const tid = args.tabId || activeTabId;
            if (tid && args.text && window.api) {
                const result = await window.api.highlightText(tid, args.text);
                if (result && result.success) {
                    showToast(result.message, 'success');
                } else {
                    showToast('Text highlighting failed', 'error');
                }
            }
        } catch (e) { console.error("browser_highlight_text failed", e); }
      }

      const linkedinPostCall = trace?.find(t => t.type === 'tool_start' && t.name === 'linkedin_post');
      const linkedinSearchCall = trace?.find(t => t.type === 'tool_start' && t.name === 'linkedin_search');

      if (linkedinPostCall) {
        try {
            const args = JSON.parse(linkedinPostCall.args);
            const tid = activeTabId; // Must have an active tab
            if (tid && window.api) {
                showToast("Automating LinkedIn Post...", "info");
                const res = await window.api.linkedinPost(tid, args.content, args.visibility);
                if (res.success) {
                    showToast("LinkedIn Draft Created!", "success");
                    autoResponseMessage = res.message;
                } else {
                    showToast(`LinkedIn Post Failed: ${res.error}`, "error");
                    autoResponseMessage = `I failed to create the post. Error: ${res.error}`;
                }
            } else {
                autoResponseMessage = "Please open a LinkedIn tab first.";
            }
        } catch (e) { console.error("linkedin_post failed", e); }
      }

      if (linkedinSearchCall) {
        try {
            const args = JSON.parse(linkedinSearchCall.args);
            const tid = activeTabId;
            if (tid && window.api) {
                showToast(`Searching LinkedIn for "${args.query}"`, "info");
                const res = await window.api.linkedinSearch(tid, args.query, args.type);
                if (res.success) {
                    autoResponseMessage = `I've opened the search results for "${args.query}".`;
                } else {
                    showToast(`Search Failed: ${res.error}`, "error");
                }
            } else {
                // If no tab, create one
                 if (window.api) {
                    const searchUrl = `https://www.linkedin.com/search/results/${args.type || 'all'}/?keywords=${encodeURIComponent(args.query)}`;
                    createTab(searchUrl, 'LinkedIn Search');
                    autoResponseMessage = `I've opened a new tab with the search results for "${args.query}".`;
                 }
            }
        } catch (e) { console.error("linkedin_search failed", e); }
      }

      return autoResponseMessage;
  };
  

  const handleOpenUrl = (url, title) => {
    console.log("Opening URL:", url);
    createTab(url, title || 'New Tab');
  };

    return (
        <Layout user={user} onLogout={onLogout}>

            <div className="flex h-full relative overflow-hidden">
                
                {/* Left Panel: Chat (60% or 100%) */}
            {/* Left Panel: Chat */}
            <motion.div 
                layout
                animate={{ 
                    width: isWorkspaceVisible ? `${100 - rightPanelWidth}%` : '100%'
                }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col relative h-full min-w-[350px] border-r border-creozen-border bg-creozen-bg z-10"
            >
                {/* Header / Top Bar */}
                <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-creozen-bg via-creozen-bg/95 to-transparent backdrop-blur-[2px]">
                    {/* Left Spacer */}
                    <div className="flex-1" />
                    
                    {/* Center: Model Selector */}
                    <div className="relative z-50">
                        <button 
                            onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                            className="flex items-center gap-2 px-3 py-1 rounded-full hover:bg-creozen-text-primary/5 text-sm text-creozen-text-muted hover:text-creozen-text-primary transition-colors border border-transparent hover:border-creozen-border"
                        >
                            <span className="font-medium text-creozen-text-primary">{selectedModel.name}</span>
                            <ChevronDown size={14} className={`transition-transform duration-200 ${isModelMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {isModelMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsModelMenuOpen(false)} />
                                    <motion.div
                                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                        transition={{ duration: 0.1 }}
                                        className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-64 bg-creozen-card border border-creozen-border rounded-xl shadow-xl overflow-hidden z-50"
                                    >
                                        <div className="p-1">
                                            {MODELS.map((model) => (
                                                <button
                                                    key={model.id}
                                                    onClick={() => {
                                                        setSelectedModel(model);
                                                        setIsModelMenuOpen(false);
                                                    }}
                                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                                                        selectedModel.id === model.id 
                                                        ? 'bg-creozen-accent-blue/10 text-creozen-accent-blue' 
                                                        : 'text-creozen-text-muted hover:text-creozen-text-primary hover:bg-creozen-text-primary/5'
                                                    }`}
                                                >
                                                    <div className={`p-1.5 rounded-md ${selectedModel.id === model.id ? 'bg-creozen-accent-blue/20 text-creozen-accent-blue' : 'bg-creozen-text-primary/5 text-creozen-text-muted'}`}>
                                                        <model.icon size={16} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="text-sm font-medium">{model.name}</div>
                                                        <div className="text-[11px] opacity-70">{model.description}</div>
                                                    </div>
                                                    {selectedModel.id === model.id && <CheckCircle size={14} className="text-creozen-accent-blue" />}
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex-1 flex justify-end items-center gap-2">
                         <button
                            onClick={() => setIsWorkspaceVisible(!isWorkspaceVisible)}
                            className="p-2 rounded-lg transition-all duration-200 text-creozen-text-muted hover:text-creozen-text-primary hover:bg-creozen-text-primary/5"
                            title={isWorkspaceVisible ? "Close sidebar" : "Open sidebar"}
                        >
                            <Globe size={20} className={`transition-transform duration-300 ${isWorkspaceVisible ? 'rotate-180 text-creozen-accent-blue' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto pt-20 pb-4 scrollbar-hide scroll-smooth">
                    <div className="max-w-3xl mx-auto px-4 space-y-8">
                        {/* Empty State / Capabilities */}
                        {messages.length === 0 && (
                            <Capabilities user={user} />
                        )}

                        {/* Chat Messages */}
                        {messages.map((msg, idx) => (
                            <MessageBubble 
                                key={idx} 
                                message={msg} 
                                onEdit={msg.role === 'user' ? () => handleEditMessage(idx) : undefined} 
                                onRead={() => speak(msg.content)}
                                onOpenUrl={handleOpenUrl}
                            />
                        ))}
                        
                        {isLoading && (
                            <div className="flex gap-4 mb-6 justify-start px-2">
                                <div className="bg-creozen-card border border-creozen-border rounded-2xl p-4 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-creozen-text-muted rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                                <div className="w-1.5 h-1.5 bg-creozen-text-muted rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                <div className="w-1.5 h-1.5 bg-creozen-text-muted rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} className="h-4" />
                    </div>
                </div>

                {/* Input Area */}
                <div className="mt-auto relative z-40 bg-gradient-to-t from-creozen-bg via-creozen-bg to-transparent">
                    <div className="max-w-3xl mx-auto px-4 pb-6 pt-2">
                        <input 
                            type="file" 
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            className="hidden"
                            accept=".pdf,.docx,.txt,.md,.json,.js,.py"
                        />

                        {/* Attachments Preview */}
                        <AnimatePresence>
                            {attachments.length > 0 && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex flex-wrap gap-2 mb-4 px-2"
                                >
                            {attachments.map((file, i) => (
                                <motion.div 
                                    key={i}
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.8, opacity: 0 }}
                                    className="bg-creozen-card border border-creozen-border rounded-lg p-2 pr-8 relative group"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-creozen-text-primary/5 rounded">
                                            <Paperclip size={14} className="text-creozen-text-muted" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-medium text-creozen-text-primary truncate max-w-[100px]">{file.filename}</span>
                                            <span className="text-[10px] text-creozen-text-muted">{Math.round(file.size / 1024)} KB</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => removeAttachment(i)}
                                        className="absolute top-1 right-1 p-1 rounded-full hover:bg-creozen-text-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X size={12} className="text-creozen-text-muted" />
                                    </button>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="relative">
                    <div className={`
                        relative bg-creozen-card/50 backdrop-blur-xl border border-creozen-border rounded-2xl
                        transition-all duration-200 focus-within:ring-1 focus-within:ring-creozen-accent-blue/50 focus-within:border-creozen-accent-blue/50
                        ${isListening ? 'ring-2 ring-red-500/50 border-red-500/50' : ''}
                    `}>
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask anything..."
                            className="w-full bg-transparent text-creozen-text-primary placeholder-creozen-text-muted px-4 py-3 pr-24 resize-none outline-none min-h-[52px] max-h-[200px] rounded-2xl scrollbar-hide"
                            rows={1}
                        />

                        {/* Toolbar */}
                        <div className="absolute right-2 bottom-2.5 flex items-center gap-1">
                            {/* Chat with Page Button */}
                            {activeTabId && (
                                <button
                                    type="button"
                                    onClick={handleChatWithPage}
                                    className="p-2 rounded-xl text-creozen-text-muted hover:text-creozen-accent-blue hover:bg-creozen-accent-blue/10 transition-colors"
                                    title="Chat with current page"
                                >
                                    <Brain size={18} />
                                </button>
                            )}

                             <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 rounded-xl text-creozen-text-muted hover:text-creozen-text-primary hover:bg-creozen-text-primary/5 transition-colors"
                                title="Attach file"
                            >
                                <Paperclip size={18} />
                            </button>
                                
                                {isSpeaking && (
                                    <button
                                        onClick={cancelSpeech}
                                        className="p-2 rounded-lg text-creozen-accent-blue bg-creozen-accent-blue/10 animate-pulse transition-all duration-200"
                                        title="Stop speaking"
                                    >
                                        <Volume2 size={18} />
                                    </button>
                                )}

                                <button
                                    onClick={handleMicClick}
                                    className={`p-2 rounded-lg transition-all duration-200 ${
                                        isListening 
                                        ? 'bg-creozen-accent-red text-white animate-pulse' 
                                        : 'text-creozen-text-muted hover:bg-creozen-text-primary/5 hover:text-creozen-text-primary'
                                    }`}
                                    title={isListening ? "Stop listening" : "Start voice input"}
                                >
                                    <Mic size={18} />
                                </button>

                                {isLoading ? (
                                    <button 
                                        onClick={handleStopGeneration}
                                        className="p-2.5 rounded-full bg-creozen-text-primary text-creozen-bg hover:opacity-80 transition-all duration-200"
                                        title="Stop generating"
                                    >
                                        <div className="w-3.5 h-3.5 rounded-full bg-creozen-bg" />
                                    </button>
                                ) : (
                                    <button 
                                        id="chat-send-button"
                                        onClick={handleSendMessage}
                                        disabled={!input.trim()}
                                        className={`p-2.5 rounded-full transition-all duration-200 ${
                                            input.trim() 
                                            ? 'bg-creozen-text-primary text-creozen-bg hover:opacity-90' 
                                            : 'bg-creozen-text-primary/10 text-creozen-text-muted cursor-not-allowed'
                                        }`}
                                        title="Send message"
                                    >
                                        <ArrowUp size={16} strokeWidth={2.5} />
                                    </button>
                                )}
                            </div>
                    </div>

                </form>
                </div>
            </div>
            </motion.div>

            {/* Right Panel: Workspace - Conditionally rendered */}
            <AnimatePresence mode="popLayout">
                {isWorkspaceVisible && (
                    <>
                        {/* Resize Handle */}
                        <motion.div
                            className="w-1 hover:w-1.5 h-full bg-transparent hover:bg-creozen-accent-blue/50 cursor-col-resize z-50 transition-all duration-200 absolute right-0 top-0 bottom-0"
                            style={{ right: rightPanelWidth + '%' }}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                const startX = e.clientX;
                                const startWidth = rightPanelWidth;
                                const handleMouseMove = (e) => {
                                    const newWidth = startWidth - ((e.clientX - startX) / window.innerWidth) * 100;
                                    if (newWidth > 20 && newWidth < 80) {
                                        setRightPanelWidth(newWidth);
                                    }
                                };
                                const handleMouseUp = () => {
                                    document.removeEventListener('mousemove', handleMouseMove);
                                    document.removeEventListener('mouseup', handleMouseUp);
                                };
                                document.addEventListener('mousemove', handleMouseMove);
                                document.addEventListener('mouseup', handleMouseUp);
                            }}
                        />

                        <motion.div 
                            layout
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: `${rightPanelWidth}%`, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                            className="h-full bg-creozen-bg overflow-hidden border-l border-creozen-border relative z-20"
                        >
                            <WorkspaceTabs />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>

        {/* Toast Notification */}
        <AnimatePresence>
            {toast && (
                <Toast 
                    message={toast.message} 
                    type={toast.type} 
                    onClose={() => setToast(null)} 
                />
            )}
        </AnimatePresence>
        <MemoryInspector 
            isOpen={isMemoryInspectorOpen} 
            onClose={toggleMemoryInspector} 
            user={user}
        />
    </Layout>
  );
};

export default Chat;