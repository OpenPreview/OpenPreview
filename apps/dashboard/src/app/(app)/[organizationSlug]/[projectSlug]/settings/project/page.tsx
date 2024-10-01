import { createClient } from '@openpreview/db/server';
import { Separator } from '@openpreview/ui/components/separator';
import { Metadata } from 'next';
import { ProjectForm } from 'src/components/dashboard/ProjectForm';

export const metadata: Metadata = {
  title: 'Project Settings',
  description: 'Manage your project settings.',
};

async function getProjectSettings(projectSlug: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('projects')
    .select('name, slug, allowed_domains(domain)')
    .eq('slug', projectSlug)
    .single();

  if (error) {
    console.error('Error fetching project settings:', error);
    throw new Error(error.message || 'Failed to fetch project settings');
  }

  return data;
}

export default async function ProjectSettingsPage({
  params,
}: {
  params: { projectSlug: string };
}) {
  const projectSettings = await getProjectSettings(params.projectSlug);

  return (
    <div className="space-y-6 border-l p-4">
      <div>
        <h3 className="text-lg font-medium">Project Settings</h3>
        <p className="text-muted-foreground text-sm">
          Manage your project details and configuration.
        </p>
      </div>
      <Separator />
      <ProjectForm initialData={projectSettings} />
    </div>
  );
}
