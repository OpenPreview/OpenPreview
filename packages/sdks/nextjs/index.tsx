'use client';

import React, { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

interface OpenPreviewProps {
  projectId: string;
  cdnUrl?: string;
}

export function OpenPreview({
  projectId,
  cdnUrl = 'https://cdn.openpreview.dev/opv2.js',
}: OpenPreviewProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const initializationAttempted = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initOpenPreview = () => {
      if (window.OpenPreview && !initializationAttempted.current) {
        window.OpenPreview.init({
          projectId,
          path: pathname,
          search: searchParams.toString(),
        });
        initializationAttempted.current = true;
      }
    };

    if (!scriptRef.current) {
      const script = document.createElement('script');
      script.src = cdnUrl;
      script.async = true;
      script.onload = initOpenPreview;
      document.body.appendChild(script);
      scriptRef.current = script;
    } else {
      initOpenPreview();
    }

    return () => {
      if (scriptRef.current && document.body.contains(scriptRef.current)) {
        document.body.removeChild(scriptRef.current);
      }
    };
  }, [projectId, pathname, searchParams, cdnUrl]);

  useEffect(() => {
    if (window.OpenPreview) {
      window.OpenPreview.init({
        projectId,
        path: pathname,
        search: searchParams.toString(),
      });
    }
  }, [projectId, pathname, searchParams]);

  return <div id="openpreview-container" />;
}

declare global {
  interface Window {
    OpenPreview: {
      init: (config: {
        projectId: string;
        path: string;
        search: string;
      }) => void;
    };
  }
}
