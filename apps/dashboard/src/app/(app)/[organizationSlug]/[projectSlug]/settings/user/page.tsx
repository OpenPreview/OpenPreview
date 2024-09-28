import { createClient } from '@lib/server';
import { Separator } from '@openpreview/ui/components/separator';
import { Metadata } from 'next';
import { UserAvatarUpload } from 'src/components/dashboard/UserAvatarUpload';
import { UserForm } from 'src/components/dashboard/UserForm';

export const metadata: Metadata = {
  title: 'User Settings',
  description: 'Manage your user settings.',
};

async function getUserSettings() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    console.error('Error fetching user settings:', error);
    throw new Error('Failed to fetch user settings');
  }

  const { data, error: profileError } = await supabase
    .from('users')
    .select('name, email, avatar_url')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Error fetching user profile:', profileError);
    throw new Error('Failed to fetch user profile');
  }

  return { ...data, id: user.id };
}

export default async function UserSettingsPage({
  params,
}: {
  params: { organizationSlug: string; projectSlug: string };
}) {
  const userSettings = await getUserSettings();

  return (
    <div className="space-y-6 border-l p-4">
      <div>
        <h3 className="text-lg font-medium">User Settings</h3>
        <p className="text-muted-foreground text-sm">
          Manage your user profile and preferences.
        </p>
      </div>
      <Separator />
      <UserAvatarUpload
        organizationSlug={params.organizationSlug}
        projectSlug={params.projectSlug}
        userId={userSettings.id}
        currentAvatarUrl={userSettings.avatar_url}
        userName={userSettings.name}
      />
      <UserForm initialData={userSettings} />
    </div>
  );
}
