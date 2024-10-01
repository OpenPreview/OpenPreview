import { createClient } from '@openpreview/db/server';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';

interface ProjectLayoutProps {
  children: ReactNode;
  params: {
    organizationSlug: string;
    projectSlug: string;
  };
}

export default async function ProjectLayout({
  children,
  params,
}: ProjectLayoutProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: organization } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', params.organizationSlug)
    .single();

  if (!organization) {
    redirect('/');
  }

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('slug', params.projectSlug)
    .eq('organization_id', organization.id)
    .single();

  if (!project) {
    redirect(`/${params.organizationSlug}`);
  }

  return <>{children}</>;
}
