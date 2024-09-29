'use client';

import { CheckIcon, ClipboardIcon } from 'lucide-react';
import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '../lib/utils';

interface CodeBlockProps {
  code: string;
  language: string;
  filename?: string;
}

function CodeBlock({ code, language, filename }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 overflow-hidden rounded-lg border bg-muted">
      {filename && (
        <div className="border-b bg-muted px-4 py-2 font-mono text-sm text-muted-foreground">
          {filename}
        </div>
      )}
      <div className="relative">
        <SyntaxHighlighter
          language={language}
          style={{
            ...oneDark,
            'code[class*="language-"]': {
              ...oneDark['code[class*="language-"]'],
              textShadow: 'none',
            },
            'pre[class*="language-"]': {
              ...oneDark['pre[class*="language-"]'],
              textShadow: 'none',
            },
          }}
          showLineNumbers
          wrapLines
          wrapLongLines
          customStyle={{
            margin: 0,
            padding: '1rem',
            fontSize: '0.875rem',
            backgroundColor: 'transparent',
          }}
          lineNumberStyle={{
            minWidth: '2.5em',
            paddingRight: '1em',
            textAlign: 'right',
            userSelect: 'none',
            color: 'hsl(var(--muted-foreground))',
          }}
          codeTagProps={{
            style: {
              fontFamily: 'var(--font-mono)',
            },
          }}
        >
          {code.trim()}
        </SyntaxHighlighter>
        <button
          onClick={copyToClipboard}
          className={cn(
            "absolute right-2 top-2 rounded-md p-2",
            "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "transition-colors"
          )}
          aria-label="Copy code to clipboard"
        >
          {copied ? (
            <CheckIcon className="h-4 w-4" />
          ) : (
            <ClipboardIcon className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}

export { CodeBlock };
