import { Toaster } from '@openpreview/ui/components/toaster';
import { cn } from '@openpreview/ui/lib/utils';
import { Inter } from 'next/font/google';
import { Header } from 'src/components/dashboard/Header';
import { Sidebar } from 'src/components/dashboard/Sidebar';
import {
  SidebarProvider,
  SidebarInset,
} from '@openpreview/ui/components/sidebar';
import { AppSidebar } from '@openpreview/ui/components/sidebar/app-sidebar';
import { fetchOrganizations } from '@openpreview/db/hooks/fetchOrganizations';
import { useUser } from '@openpreview/db/hooks/useUser/server';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const organizations = await fetchOrganizations();
  const { user } = await useUser();
  return (
    <body
      className={cn(
        inter.variable,
        'font-inter bg-background text-foreground antialiased',
      )}
    >
      <SidebarProvider>
        <AppSidebar
          orgs={organizations}
          user={{
            name: user?.name,
            email: user?.email,
            avatar: user?.avatar_url,
          }}
        />

        <SidebarInset>
          <Header />
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
          <Toaster />
        </SidebarInset>
      </SidebarProvider>
    </body>
  );
}
