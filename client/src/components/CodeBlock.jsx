import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const CodeBlock = ({ language, value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-lg overflow-hidden my-4 border border-creozen-border">
      <div className="flex items-center justify-between px-4 py-2 bg-creozen-card border-b border-creozen-border">
        <span className="text-xs text-creozen-text-muted font-medium uppercase">{language || 'text'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-creozen-text-muted hover:text-creozen-text-primary transition-colors"
        >
          {copied ? (
            <>
              <Check size={14} className="text-green-400" />
              <span className="text-green-400">Copied</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: '1.5rem',
          background: 'rgba(0,0,0,0.5)',
          fontSize: '0.875rem',
        }}
        wrapLongLines={true}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
};

export default CodeBlock;
