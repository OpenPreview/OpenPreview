'use client';

import * as React from 'react';
import {
  Command,
  Frame,
  LifeBuoy,
  Map,
  PieChart,
  Send,
  Settings2,
  Code,
  Home,
  MessageSquare,
} from 'lucide-react';
import {} from 'lucide-react';

import { NavMain } from './nav-main';
import { NavProjects } from './nav-projects';
import { NavSecondary } from './nav-secondary';
import { NavUser } from './nav-user';
import { Separator } from '@openpreview/ui/components/separator';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@openpreview/ui/components/sidebar';
import { Organization } from '@openpreview/db/hooks/fetchOrganizations';
import { OrgSwitcher } from './nav-organizations';
import Image from 'next/image';
const data = {
  navMain: [
    {
      title: 'Dashboard',
      url: '',
      icon: Home,
    },
    {
      title: 'Development',
      url: 'development',
      icon: Code,
    },
    {
      title: 'Comments',
      url: 'comments',
      icon: MessageSquare,
    },
    {
      title: 'Settings',
      url: 'settings',
      icon: Settings2,
    },
  ],
  navSecondary: [
    {
      title: 'Support',
      url: '#',
      icon: LifeBuoy,
    },
    {
      title: 'Feedback',
      url: '#',
      icon: Send,
    },
  ],
};

function AppLogo() {
  return (
    <div className="mb-4 flex items-center">
      <Image
        src="/images/logo.png"
        alt="OpenPreview Logo"
        width={32}
        height={32}
        className="mr-2"
      />
      <h1 className="text-foreground text-xl font-bold">OpenPreview</h1>
    </div>
  );
}

export function AppSidebar({
  user,
  orgs,
  ...props
}: {
  user: {
    name: string;
    email: string;
    avatar_url: string;
  };
  orgs: Organization[];
} & React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <AppLogo />
        <OrgSwitcher orgs={orgs} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
