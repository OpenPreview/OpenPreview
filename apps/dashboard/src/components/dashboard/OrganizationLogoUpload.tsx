'use client';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@openpreview/ui/components/avatar';
import { Button } from '@openpreview/ui/components/button';
import { toast } from '@openpreview/ui/hooks/use-toast';
import { Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { updateOrganizationLogo } from '../../app/(app)/[organizationSlug]/[projectSlug]/settings/organization/actions';

interface OrganizationLogoUploadProps {
  organizationSlug: string;
  projectSlug: string;
  currentLogoUrl?: string;
  organizationName: string;
}

export function OrganizationLogoUpload({
  organizationSlug,
  projectSlug,
  currentLogoUrl,
  organizationName,
}: OrganizationLogoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(
    currentLogoUrl || null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setIsUploading(true);
    try {
      const newLogoUrl = await updateOrganizationLogo(formData);
      setPreviewImage(newLogoUrl);
      toast({
        title: 'Logo updated',
        description: 'Your organization logo has been successfully updated.',
      });
      router.refresh();
    } catch (error) {
      console.error('Error updating logo:', error);
      toast({
        title: 'Error',
        description: 'Failed to update organization logo. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  }

  function handleButtonClick() {
    fileInputRef.current?.click();
  }

  return (
    <form action={handleSubmit}>
      <input type="hidden" name="organizationSlug" value={organizationSlug} />
      <input type="hidden" name="projectSlug" value={projectSlug} />
      <div className="flex items-center space-x-4">
        <Avatar className="h-24 w-24">
          <AvatarImage src={previewImage || undefined} alt={organizationName} />
          <AvatarFallback>
            {organizationName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="mb-2 text-lg font-medium">Organization Logo</h3>
          <div className="flex items-center space-x-2">
            <input
              type="file"
              name="logo"
              accept="image/*"
              disabled={isUploading}
              className="sr-only"
              ref={fileInputRef}
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) {
                  setPreviewImage(URL.createObjectURL(file));
                  e.target.form?.requestSubmit();
                }
              }}
              aria-label="Upload new logo"
            />
            <Button
              type="button"
              variant="outline"
              disabled={isUploading}
              onClick={handleButtonClick}
            >
              <Upload className="mr-2 h-4 w-4" />
              {isUploading ? 'Uploading...' : 'Upload new logo'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
