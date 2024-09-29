import { createClient } from '@lib/server';
import { Separator } from '@openpreview/ui/components/separator';
import { Metadata } from 'next';
import { OrganizationForm } from 'src/components/dashboard/OrganizationForm';
import { OrganizationLogoUpload } from 'src/components/dashboard/OrganizationLogoUpload';

export const metadata: Metadata = {
  title: 'Organization Settings',
  description: 'Manage your organization settings.',
};

async function getOrganizationSettings(organizationSlug: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('organizations')
    .select('name, slug, logo_url')
    .eq('slug', organizationSlug)
    .single();

  if (error) {
    console.error('Error fetching organization settings:', error);
    throw new Error('Failed to fetch organization settings');
  }

  return data;
}

export default async function OrganizationSettingsPage({
  params,
}: {
  params: { organizationSlug: string; projectSlug: string };
}) {
  const organizationSettings = await getOrganizationSettings(
    params.organizationSlug,
  );

  return (
    <div className="space-y-6 border-l p-4">
      <div>
        <h3 className="text-lg font-medium">Organization Settings</h3>
        <p className="text-muted-foreground text-sm">
          Manage your organization details and configuration.
        </p>
      </div>
      <Separator />
      <OrganizationLogoUpload
        organizationSlug={organizationSettings.slug}
        currentLogoUrl={organizationSettings.logo_url}
        organizationName={organizationSettings.name}
      />
      <OrganizationForm
        initialData={organizationSettings}
        projectSlug={params.projectSlug}
      />
    </div>
  );
}
