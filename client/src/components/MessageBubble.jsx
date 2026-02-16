import { motion } from "framer-motion";
import { Brain, Copy, Paperclip, Pencil, Volume2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CitationBadge from "./CitationBadge";
import CodeBlock from "./CodeBlock";

import { Check, FileSpreadsheet } from "lucide-react";
import { useRef, useState } from 'react';

const TableWrapper = ({ children }) => {
    const [copied, setCopied] = useState(false);
    const tableRef = useRef(null);

    const handleCopy = () => {
        if (!tableRef.current) return;

        // Convert table to CSV/Markdown
        const rows = Array.from(tableRef.current.querySelectorAll('tr'));
        const csvContent = rows.map(row => {
            const cells = Array.from(row.querySelectorAll('th, td'));
            return cells.map(cell => {
                let text = cell.innerText.replace(/"/g, '""'); // Escape quotes
                return `"${text}"`; // Quote all fields
            }).join(',');
        }).join('\n');

        navigator.clipboard.writeText(csvContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="my-6 border border-creozen-border rounded-lg overflow-hidden bg-creozen-card/30">
            <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-creozen-border">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    <FileSpreadsheet size={14} />
                    <span>Table</span>
                </div>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                >
                    {copied ? (
                        <>
                            <Check size={12} className="text-green-400" />
                            <span>Copied</span>
                        </>
                    ) : (
                        <>
                            <Copy size={12} />
                            <span>Copy</span>
                        </>
                    )}
                </button>
            </div>
            <div className="overflow-x-auto">
                <table ref={tableRef} className="min-w-full divide-y divide-creozen-border text-sm">
                    {children}
                </table>
            </div>
        </div>
    );
};

const MessageBubble = ({ message, onEdit, onRead, onOpenUrl }) => {
  const isAi = message.role === "assistant";
  const plan = message.plan;

  // Helper to detect Google Doc/Sheet links
  const isGoogleWorkspaceLink = (url) => {
    return url.includes('docs.google.com/document') || url.includes('docs.google.com/spreadsheets');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex mb-6 ${isAi ? "justify-start" : "justify-end"}`}
    >
      {/* Wrapper */}
      <div className="relative group max-w-[85%]">
        {/* Bubble */}
        <div
          className={`rounded-2xl px-5 py-3.5 shadow-sm text-sm leading-relaxed overflow-hidden ${
            isAi
              ? "bg-[var(--msg-bot-bg)] text-creozen-text-primary pl-0"
              : "bg-[var(--msg-user-bg)] text-creozen-text-primary border border-creozen-border"
          }`}
        >
          {/* Thinking / Plan Area */}
          {isAi && plan && (
            <div className="mb-4 bg-creozen- accent-blue/5 border-l-2 border-creozen-accent-blue/30 rounded-r-xl p-4 overflow-hidden">
                <div className="flex items-center gap-2 mb-2 text-creozen-accent-blue">
                    <Brain size={16} className="animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-widest">Planned Strategy</span>
                </div>
                <div className="text-xs text-creozen-text-muted prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{plan}</ReactMarkdown>
                </div>
            </div>
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-3 space-y-2">
              {message.attachments.map((file, i) => (
                <div key={i} className="flex gap-2 p-2 rounded-lg bg-creozen-card border border-creozen-border text-xs text-creozen-text-muted max-w-full">
                  <div className="p-1.5 bg-creozen-text-primary/5 rounded-md shrink-0">
                    <Paperclip size={14} className="text-creozen-accent-blue" />
                  </div>
                  <div className="truncate min-w-0 flex-1">
                    <div className="font-medium truncate text-creozen-text-primary">{file.filename}</div>
                    <div className="text-[10px] text-creozen-text-muted uppercase">{file.type?.split('/').pop() || 'FILE'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="text-sm/6 space-y-4">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => <h1 className="text-2xl font-semibold mb-4 mt-6 first:mt-0">{children}</h1>,
                h2: ({ children }) => <h2 className="text-xl font-semibold mb-3 mt-5 first:mt-0">{children}</h2>,
                h3: ({ children }) => <h3 className="text-lg font-medium mb-2 mt-4 first:mt-0">{children}</h3>,
                h4: ({ children }) => <h4 className="text-base font-medium mb-2 mt-4 first:mt-0">{children}</h4>,
                p: ({ children }) => <p className="mb-4 last:mb-0 leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="pl-1 leading-relaxed">{children}</li>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-creozen-border pl-4 py-1 my-4 text-creozen-text-muted italic bg-creozen-bg/50 rounded-r-lg">
                    {children}
                  </blockquote>
                ),
                hr: () => <hr className="my-6 border-creozen-border" />,
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  return !inline && match ? (
                    <CodeBlock
                      language={match[1]}
                      value={String(children).replace(/\n$/, "")}
                      {...props}
                    />
                  ) : (
                    <code
                      className={`${className} bg-creozen-text-primary/10 rounded px-1.5 py-0.5 text-[0.9em] font-mono text-creozen-accent-blue`}
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                table: ({ children }) => <TableWrapper>{children}</TableWrapper>,
                thead: ({ children }) => (
                  <thead className="bg-creozen-text-primary/5">{children}</thead>
                ),
                th: ({ children }) => (
                  <th className="px-4 py-3 text-left font-semibold text-creozen-text-muted uppercase tracking-wider text-xs border-b border-creozen-border">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-4 py-3 whitespace-nowrap text-creozen-text-muted border-b border-creozen-border last:border-0">
                    {children}
                  </td>
                ),
                // Links and citations remain the same
                a: ({ href, children }) => {
                    const isWorkspace = isGoogleWorkspaceLink(href);
                    
                    // Check if this is a citation (numbered link like [1], [2])
                    const isCitation = /^\[\d+\]$/.test(String(children));
                    const citationNumber = isCitation ? String(children).replace(/[\[\]]/g, '') : null;
                    
                    const handleLinkClick = (e) => {
                        e.preventDefault();
                        if (onOpenUrl) {
                            onOpenUrl(href, isCitation ? `Source ${citationNumber}` : String(children));
                        } else {
                            window.open(href, '_blank');
                        }
                    };

                    if (isCitation && citationNumber) {
                        // Extract site name from URL
                        let siteName = '';
                        try {
                            const url = new URL(href);
                            siteName = url.hostname.replace('www.', '');
                        } catch (e) {
                            siteName = href;
                        }
                        
                        return (
                            <CitationBadge
                                number={citationNumber}
                                url={href}
                                title={href}
                                siteName={siteName}
                                onClick={(url) => {
                                    if (onOpenUrl) {
                                        onOpenUrl(url, `Source ${citationNumber}`);
                                    } else {
                                        window.open(url, '_blank');
                                    }
                                }}
                            />
                        );
                    }
                    
                    if (isWorkspace && onOpenUrl) {
                        return (
                            <span className="inline-flex items-center gap-2 align-baseline">
                                <a
                                    href={href}
                                    onClick={handleLinkClick}
                                    className="text-creozen-accent-blue hover:underline break-all"
                                >
                                    {children}
                                </a>
                                <button
                                    onClick={() => onOpenUrl(href, String(children))}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-creozen-accent-blue/10 text-creozen-accent-blue text-xs hover:bg-creozen-accent-blue/20 transition-colors whitespace-nowrap"
                                >
                                    Open in Workspace
                                </button>
                            </span>
                        );
                    }

                    return (
                        <a
                            href={href}
                            onClick={handleLinkClick}
                            className="text-creozen-accent-blue hover:underline break-all"
                        >
                            {children}
                        </a>
                    );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        </div>

        {/* Actions */}
        <div
          className={`absolute -bottom-8 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${
            isAi ? "left-0" : "right-0"
          }`}
        >
          <button
            onClick={() => navigator.clipboard.writeText(message.content)}
            className="p-1.5 rounded-md text-creozen-text-muted hover:text-creozen-text-primary hover:bg-creozen-text-primary/5 transition-colors"
            title="Copy"
          >
            <Copy size={14} />
          </button>
          
          <button
            onClick={onRead}
            className="p-1.5 rounded-md text-creozen-text-muted hover:text-creozen-text-primary hover:bg-creozen-text-primary/5 transition-colors"
            title="Read Aloud"
          >
            <Volume2 size={14} />
          </button>

          {!isAi && onEdit && (
            <button
              onClick={onEdit}
              className="p-1.5 rounded-md text-creozen-text-muted hover:text-creozen-text-primary hover:bg-creozen-text-primary/5 transition-colors"
              title="Edit"
            >
              <Pencil size={14} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default MessageBubble;
