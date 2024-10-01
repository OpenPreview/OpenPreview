import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CDN App',
  description: 'CDN app for hosting scripts',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
