'use client';
import React, { useEffect } from 'react';
import Script from 'next/script';

interface OpenPreviewProps {
  projectId: string;
  cdnUrl?: string;
}

export function OpenPreview({
  projectId,
  cdnUrl = 'https://cdn.openpreview.dev/opv2.js',
}: OpenPreviewProps) {
  const handleScriptLoad = () => {
    if (window.OpenPreview) {
      const path = window.location.pathname;
      const search = window.location.search.slice(1); // Remove leading '?'

      window.OpenPreview.init({
        projectId,
        path,
        search,
      });
    }
  };

  useEffect(() => {
    // Handle route changes
    const handleRouteChange = () => {
      if (window.OpenPreview) {
        const path = window.location.pathname;
        const search = window.location.search.slice(1);

        window.OpenPreview.init({
          projectId,
          path,
          search,
        });
      }
    };

    // Listen for popstate events (browser back/forward)
    window.addEventListener('popstate', handleRouteChange);

    // Listen for pushstate/replacestate events (client-side navigation)
    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);

    history.pushState = function (
      data: any,
      unused: string,
      url?: string | URL | null,
    ) {
      originalPushState(data, unused, url);
      handleRouteChange();
    };

    history.replaceState = function (
      data: any,
      unused: string,
      url?: string | URL | null,
    ) {
      originalReplaceState(data, unused, url);
      handleRouteChange();
    };

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, [projectId]);

  return (
    <Script
      src={cdnUrl}
      strategy="afterInteractive"
      onReady={handleScriptLoad}
    />
  );
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
