import React from 'react';

interface OpenPreviewProps {
    projectId: string;
    cdnUrl?: string;
}
declare function OpenPreview({ projectId, cdnUrl, }: OpenPreviewProps): React.JSX.Element;
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

export { OpenPreview };
