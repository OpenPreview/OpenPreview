'use client';

import { useFetchOrganizations } from '@openpreview/db/hooks/fetchOrganizations';
import { useOrganization } from '@openpreview/db/hooks/useOrganization';
import { useProject } from '@openpreview/db/hooks/useProject';
import { Button } from '@openpreview/ui/components/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@openpreview/ui/components/sheet';
import { Skeleton } from '@openpreview/ui/components/skeleton';
import { Code, Home, Menu, MessageSquare, Plus, Settings } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { CreateOrganizationDialog } from './CreateOrganizationDialog';
import { OrganizationSelector } from './OrganizationSelector';

const sidebarItems = [
  { href: '', icon: Home, label: 'Dashboard' },
  { href: 'development', icon: Code, label: 'Development' },
  { href: 'comments', icon: MessageSquare, label: 'Comments' },
];

const sidebarFooter = [{ href: 'settings', icon: Settings, label: 'Settings' }];

export function Sidebar() {
  const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false);
  const pathname = usePathname();
  const { organization, isLoading: isLoadingOrganization } = useOrganization();
  const { organizations, isLoading: isLoadingOrganizations } =
    useFetchOrganizations();
  const { project, isLoading: isLoadingProject } = useProject();

  const NavLink = ({
    href,
    icon: Icon,
    children,
  }: {
    href: string;
    icon: React.ElementType;
    children: React.ReactNode;
  }) => (
    <Link
      href={href}
      className={`text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center px-4 py-2 ${pathname === href ? 'bg-accent text-accent-foreground' : ''}`}
    >
      <Icon className="mr-3 h-5 w-5" />
      {children}
    </Link>
  );

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex items-center p-4">
        <Image
          src="/images/logo.png"
          alt="OpenPreview Logo"
          width={32}
          height={32}
          className="mr-2"
        />
        <h1 className="text-foreground text-xl font-bold">OpenPreview</h1>
      </div>
      <div className="px-4 py-2">
        {isLoadingOrganizations ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <OrganizationSelector organizations={organizations} />
        )}
        <Button
          variant="outline"
          size="sm"
          className="mt-2 w-full"
          onClick={() => setIsCreateOrgOpen(true)}
          disabled={isLoadingOrganizations}
        >
          <Plus className="mr-2 h-4 w-4" /> New Organization
        </Button>
      </div>
      {project && (
        <>
          <nav className="mt-6 flex-1">
            {isLoadingOrganization ? (
              sidebarItems.map((item, index) => (
                <Skeleton key={index} className="mx-4 mb-2 h-10" />
              ))
            ) : organization ? (
              <>
                {sidebarItems.map(item => (
                  <NavLink
                    key={item.href}
                    href={`/${organization.slug}/${project.slug}/${item.href}`}
                    icon={item.icon}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </>
            ) : null}
          </nav>
          <div className="border-border border-t p-4">
            {isLoadingOrganization
              ? sidebarFooter.map((item, index) => (
                  <Skeleton key={index} className="mb-2 h-10" />
                ))
              : organization
                ? sidebarFooter.map(item => (
                    <NavLink
                      key={item.href}
                      href={`/${organization.slug}/${project.slug}/${item.href}`}
                      icon={item.icon}
                    >
                      {item.label}
                    </NavLink>
                  ))
                : null}
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <button className="fixed left-4 top-4 z-50 md:hidden">
            <Menu className="text-foreground h-6 w-6" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>
      <aside className="bg-background border-border hidden h-screen w-64 border-r shadow-md md:block">
        <SidebarContent />
      </aside>
      <CreateOrganizationDialog
        open={isCreateOrgOpen}
        onOpenChange={setIsCreateOrgOpen}
      />
    </>
  );
}
