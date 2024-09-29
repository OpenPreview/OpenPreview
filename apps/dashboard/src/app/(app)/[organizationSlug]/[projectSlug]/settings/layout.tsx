import { Separator } from '@openpreview/ui/components/separator';
import { Metadata } from 'next';
import { SidebarNav } from 'src/components/dashboard/SidebarNav';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Manage your project, organization, and user settings.',
};

interface SettingsLayoutProps {
  children: React.ReactNode;
  params: {
    organizationSlug: string;
    projectSlug: string;
  };
}

export default function SettingsLayout({
  children,
  params,
}: SettingsLayoutProps) {
  const sidebarNavItems = [
    {
      title: 'Project',
      href: `/${params.organizationSlug}/${params.projectSlug}/settings/project`,
    },
    {
      title: 'Organization',
      href: `/${params.organizationSlug}/${params.projectSlug}/settings/organization`,
    },
    {
      title: 'Members',
      href: `/${params.organizationSlug}/${params.projectSlug}/settings/members`,
    },
    {
      title: 'User',
      href: `/${params.organizationSlug}/${params.projectSlug}/settings/user`,
    },
  ];

  return (
    <div className="space-y-6 p-10 pb-16">
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your project, organization, and user settings.
        </p>
      </div>
      <Separator className="my-6" />
      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
        <aside className="-mx-4 lg:w-1/5">
          <SidebarNav items={sidebarNavItems} />
        </aside>
        <div className="flex-1 lg:max-w-2xl">{children}</div>
      </div>
    </div>
  );
}
