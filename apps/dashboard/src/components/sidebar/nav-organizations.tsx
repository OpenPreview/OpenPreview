import {
  getOrganization,
  Organization,
} from '@openpreview/db/hooks/useOrganization';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@openpreview/ui/components/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@openpreview/ui/components/dropdown-menu';
import { useParams, useRouter } from 'next/navigation';
import * as React from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import Image from 'next/image';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@openpreview/ui/components/avatar';

const OrgLogo = ({ org }: { org: Organization }) => {
  return (
    <>
      <Avatar className="size-6">
        <AvatarImage src={org.logo_url ?? undefined} alt={`${org.name} logo`} />
        <AvatarFallback>{org.name.slice(0, 2)}</AvatarFallback>
      </Avatar>
      <span className="truncate font-semibold">{org.name}</span>
    </>
  );
};

function OrgSwitcher({ orgs }: { orgs: Organization[] }) {
  const [activeOrg, setActiveOrg] = React.useState<Organization | null>(null);
  const params = useParams();
  const router = useRouter();
  React.useEffect(() => {
    async function fetchData() {
      if (
        params.organizationSlug &&
        typeof params.organizationSlug === 'string'
      ) {
        const org = await getOrganization(params.organizationSlug);
        setActiveOrg(org);
      }
    }
    fetchData();
  }, [params.organizationSlug, params.projectSlug]);

  const handleOrganizationChange = (slug: string) => {
    router.push(`/${slug}`);
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="w-fit px-1.5">
              {activeOrg ? (
                <OrgLogo org={activeOrg} />
              ) : (
                <div className="flex items-center">Select an Organization</div>
              )}
              <ChevronDown className="opacity-50" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-64 rounded-lg"
            align="start"
            side="bottom"
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Organizations
            </DropdownMenuLabel>
            {orgs.map((org, index) => (
              <DropdownMenuItem
                key={org.name}
                onClick={() => {
                  handleOrganizationChange(org.slug);
                }}
                className="gap-2 p-2"
              >
                <OrgLogo org={org} />
                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2">
              <div className="bg-background flex size-6 items-center justify-center rounded-md border">
                <Plus className="size-4" />
              </div>
              <div className="text-muted-foreground font-medium">Add team</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export { OrgSwitcher };
