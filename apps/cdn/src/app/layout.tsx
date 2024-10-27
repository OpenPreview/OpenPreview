import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'OpenPreview CDN',
  description: 'Content Delivery Network for OpenPreview',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
