'use client';

import { useState } from 'react';
import { Button } from '@openpreview/ui/components/button';
import { Plus } from 'lucide-react';
import { OrganizationSelector } from './OrganizationSelector';
import { CreateOrganizationDialog } from './CreateOrganizationDialog';

export function OrganizationSelectorWrapper({ organizations }) {
  const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false);

  return (
    <>
      <OrganizationSelector organizations={organizations} />
      <Button
        variant="outline"
        size="sm"
        className="mt-2 w-full"
        onClick={() => setIsCreateOrgOpen(true)}
      >
        <Plus className="mr-2 h-4 w-4" /> New Organization
      </Button>
      <CreateOrganizationDialog
        open={isCreateOrgOpen}
        onOpenChange={setIsCreateOrgOpen}
      />
    </>
  );
}