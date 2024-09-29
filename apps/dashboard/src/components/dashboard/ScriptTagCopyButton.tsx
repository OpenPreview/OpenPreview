'use client';

import { Button } from '@openpreview/ui/components/button';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

interface ScriptTagCopyButtonProps {
  scriptTag: string;
}

export function ScriptTagCopyButton({ scriptTag }: ScriptTagCopyButtonProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(scriptTag);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <Button onClick={handleCopy} variant="outline" size="sm" className="mt-2">
      {isCopied ? (
        <>
          <Check className="mr-2 h-4 w-4" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="mr-2 h-4 w-4" />
          Copy Script Tag
        </>
      )}
    </Button>
  );
}
