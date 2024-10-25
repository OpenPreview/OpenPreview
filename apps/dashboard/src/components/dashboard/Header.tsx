'use client';
import { useUser } from '@openpreview/db/hooks/useUser/client';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@openpreview/ui/components/avatar';
import { Button } from '@openpreview/ui/components/button';
import { handleSignOut } from './actions';
import { SidebarTrigger } from '@openpreview/ui/components/sidebar';
import { Separator } from '@openpreview/ui/components/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbList,
} from '@openpreview/ui/components/breadcrumb';
import { useParams, useRouter } from 'next/navigation';
import { Project, getProject } from '@openpreview/db/hooks/useProject';
import {
  getOrganization,
  Organization,
} from '@openpreview/db/hooks/useOrganization';
import React from 'react';
export function Header() {
  const { user } = useUser();
  const router = useRouter();
  const params = useParams();
  const [project, setProject] = React.useState<Project | null>(null);
  const [organization, setOrganization] = React.useState<Organization | null>(
    null,
  );
  React.useEffect(() => {
    async function fetchData() {
      if (params.projectSlug && typeof params.projectSlug === 'string') {
        const project = await getProject(params.projectSlug);
        setProject(project);
      }
      if (
        params.organizationSlug &&
        typeof params.organizationSlug === 'string'
      ) {
        const org = await getOrganization(params.organizationSlug);
        setOrganization(org);
      }
    }
    fetchData();
  }, [params.projectSlug, params.organizationSlug]);

  return (
    <header className="flex h-16 shrink-0 items-center gap-2">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            {organization && (
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href={`/${organization.slug}`}>
                  {organization.name}
                </BreadcrumbLink>
              </BreadcrumbItem>
            )}
            {organization && project && (
              <>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{project.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  );
}
