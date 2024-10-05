import { Toaster } from '@openpreview/ui/components/toaster';
import { cn } from '@openpreview/ui/lib/utils';
import { Inter } from 'next/font/google';
import { Header } from 'src/components/dashboard/Header';
import { Sidebar } from 'src/components/dashboard/Sidebar';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <body
      className={cn(
        inter.variable,
        'font-inter bg-background text-foreground antialiased',
      )}
    >
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-4">
            {children}
          </main>
        </div>
      </div>
      <Toaster />
    </body>
  );
}
