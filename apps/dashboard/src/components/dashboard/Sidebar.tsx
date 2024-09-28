'use client';

import { Button } from '@openpreview/ui/components/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@openpreview/ui/components/sheet';
import {
  Code,
  FileText,
  Home,
  Menu,
  MessageSquare,
  Plus,
  Settings,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { CreateOrganizationDialog } from './CreateOrganizationDialog';
import { OrganizationSelector } from './OrganizationSelector';

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
}

interface SidebarProps {
  organizations: Organization[];
}

const sidebarItems = [
  { href: '', icon: Home, label: 'Dashboard' },
  { href: 'development', icon: Code, label: 'Development' },
  { href: 'comments', icon: MessageSquare, label: 'Comments' },
  { href: 'documents', icon: FileText, label: 'Documents' },
];

const sidebarFooter = [{ href: 'settings', icon: Settings, label: 'Settings' }];

export function Sidebar({ organizations }: SidebarProps) {
  const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false);
  const pathname = usePathname();
  const pathParts = pathname.split('/').filter(Boolean);
  const organizationSlug = pathParts[0];
  const projectSlug = pathParts[1];

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
        <OrganizationSelector organizations={organizations} />
        <Button
          variant="outline"
          size="sm"
          className="mt-2 w-full"
          onClick={() => setIsCreateOrgOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" /> New Organization
        </Button>
      </div>
      <nav className="mt-6 flex-1">
        {organizationSlug && projectSlug && (
          <>
            {sidebarItems.map(item => (
              <NavLink
                key={item.href}
                href={`/${organizationSlug}/${projectSlug}/${item.href}`}
                icon={item.icon}
              >
                {item.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>
      <div className="border-border border-t p-4">
        {sidebarFooter.map(item => (
          <NavLink
            key={item.href}
            href={`/${organizationSlug}/${projectSlug}/${item.href}`}
            icon={item.icon}
          >
            {item.label}
          </NavLink>
        ))}
      </div>
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
