import { createClient } from '@openpreview/db/server';
import { Inter } from 'next/font/google';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

interface DashboardLayoutProps {
  children: ReactNode;
  params: {
    organizationSlug?: string;
  };
}

export default async function DashboardLayout({
  children,
  params,
}: DashboardLayoutProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  if (params.organizationSlug) {
    const { data: organization } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', params.organizationSlug)
      .single();

    if (!organization) {
      redirect('/');
    }
  }

  return <>{children}</>;
}
