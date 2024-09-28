import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings Overview',
  description: 'Overview of project and organization settings.',
};

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Settings Overview</h3>
      <p className="text-muted-foreground text-sm">
        Select a category from the sidebar to manage specific settings.
      </p>
    </div>
  );
}
