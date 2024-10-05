'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { OrganizationSelectorWrapper } from './OrganizationSelectorWrapper';
import { NavLink } from './NavLink';
import { getOrganization, Organization } from '@openpreview/db/hooks/useOrganization';
import { getProject, Project } from '@openpreview/db/hooks/useProject';
import { Code, Home, MessageSquare, Settings } from 'lucide-react';

const sidebarItems = [
  { href: '', icon: Home, label: 'Dashboard' },
  { href: 'development', icon: Code, label: 'Development' },
  { href: 'comments', icon: MessageSquare, label: 'Comments' },
];

const sidebarFooter = [{ href: 'settings', icon: Settings, label: 'Settings' }];

export function SidebarContent({ organizations }) {
  const params = useParams();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (params.organizationSlug && typeof params.organizationSlug === 'string') {
        const org = await getOrganization(params.organizationSlug);
        setOrganization(org);
      }
      if (params.projectSlug && typeof params.projectSlug === 'string') {
        const proj = await getProject(params.projectSlug);
        setProject(proj);
      }
    }
    fetchData();
  }, [params.organizationSlug, params.projectSlug]);

  return (
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
        <OrganizationSelectorWrapper organizations={organizations} />
      </div>
      {project && (
        <>
          <nav className="mt-6 flex-1">
            {organization ? (
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
            {organization
              ? sidebarFooter.map(item => (
                  <div key={item.href} className="overflow-hidden rounded-md">
                    <NavLink
                      href={`/${organization.slug}/${project.slug}/${item.href}`}
                      icon={item.icon}
                    >
                      {item.label}
                    </NavLink>
                  </div>
                ))
              : null}
          </div>
        </>
      )}
    </div>
  );
}