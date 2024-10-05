import { useUser } from '@openpreview/db/hooks/useUser/server';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings Overview',
  description: 'Overview of project and organization settings.',
};

export default async function SettingsPage() {
  const { user } = await useUser();
  return (
    <div className="space-y-6 border-l p-4">
      <h3 className="text-lg font-medium">Settings Overview</h3>
      <p className="text-muted-foreground text-sm">
        Select a category from the sidebar to manage specific settings.
      </p>
    </div>
  );
}
