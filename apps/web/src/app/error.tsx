'use client';

import { Button } from '@ui/components/button';
import { AlertCircle } from 'lucide-react';
import { Inter } from 'next/font/google';
import Link from 'next/link';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <body
      className={`${inter.variable} bg-background font-inter text-foreground flex min-h-screen flex-col tracking-normal antialiased`}
    >
      <main className="flex flex-grow items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-max text-center">
          <AlertCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
          <h1 className="text-foreground mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
            Oops! Something went wrong
          </h1>
          <p className="text-muted-foreground mt-2 text-base">
            {error.message || 'An unexpected error occurred'}
          </p>
          {error.digest && (
            <p className="text-muted-foreground mt-2 text-sm">
              Error ID: {error.digest}
            </p>
          )}
          <div className="mt-6 space-x-4">
            <Button onClick={reset}>Try again</Button>
            <Button variant="outline" asChild>
              <Link href="/">Go to Home</Link>
            </Button>
          </div>
        </div>
      </main>
    </body>
  );
}
