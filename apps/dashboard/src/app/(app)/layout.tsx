import { createClient } from '@lib/server';
import { Toaster } from '@openpreview/ui/components/toaster';
import { cn } from '@openpreview/ui/lib/utils';
import { Inter } from 'next/font/google';
import { redirect } from 'next/navigation';
import { Header } from 'src/components/dashboard/Header';
import { Sidebar } from 'src/components/dashboard/Sidebar';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const { data: onboarding } = await supabase
    .from('users')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single();

  if (!onboarding?.onboarding_completed) {
    redirect('/onboarding');
  }

  const { data: organizations } = await supabase
    .from('organizations')
    .select('id, name, slug, logo_url')
    .order('name');

  return (
    <body
      className={cn(
        inter.variable,
        'font-inter bg-background text-foreground antialiased',
      )}
    >
      <div className="flex h-screen">
        <Sidebar organizations={organizations || []} />
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
