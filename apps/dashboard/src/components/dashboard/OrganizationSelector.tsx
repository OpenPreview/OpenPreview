'use client';

import { Organization } from '@openpreview/db/hooks/useOrganization';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@openpreview/ui/components/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openpreview/ui/components/select';
import { usePathname, useRouter } from 'next/navigation';

interface OrganizationSelectorProps {
  organizations: Organization[];
}

export function OrganizationSelector({
  organizations,
}: OrganizationSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const currentOrgSlug = pathname.split('/')[1] || '';

  const handleOrganizationChange = (slug: string) => {
    router.push(`/${slug}`);
  };

  console.log(organizations);

  return (
    <div className="mb-4">
      <label
        htmlFor="organization"
        className="mb-1 block text-sm font-medium text-gray-700"
      >
        Organization
      </label>
      <Select onValueChange={handleOrganizationChange} value={currentOrgSlug}>
        <SelectTrigger id="organization">
          <SelectValue placeholder="Select organization" />
        </SelectTrigger>
        <SelectContent>
          {organizations.map(org => (
            <SelectItem key={org.id} value={org.slug}>
              <div className="flex items-center">
                <Avatar className="mr-2 h-6 w-6">
                  <AvatarImage
                    src={`${org.logo_url}`}
                    alt={`${org.name} logo`}
                  />
                  <AvatarFallback>{org.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                {org.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
