'use client';

import { useSupabaseBrowser } from '@openpreview/db/client';
import { Button } from '@openpreview/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@openpreview/ui/components/dialog';
import { Input } from '@openpreview/ui/components/input';
import { Label } from '@openpreview/ui/components/label';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface CreateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateOrganizationDialog({
  open,
  onOpenChange,
}: CreateOrganizationDialogProps) {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const supabase = useSupabaseBrowser();
    const { data, error } = await supabase
      .from('organizations')
      .insert({ name })
      .select()
      .single();

    setIsLoading(false);

    if (error) {
      console.error('Error creating organization:', error);
      // Handle error (show error message to user)
    } else {
      onOpenChange(false);
      setName('');
      router.refresh(); // Refresh the page to show the new organization
      router.push(`/${data.slug}`); // Navigate to the new organization's page
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Organization</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={e => setName(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Organization'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
