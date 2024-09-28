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
import { updateUserAvatar } from '../../app/(app)/[organizationSlug]/[projectSlug]/settings/user/actions';

interface UserAvatarUploadProps {
  userId: string;
  organizationSlug: string;
  projectSlug: string;
  currentAvatarUrl?: string;
  userName: string;
}

export function UserAvatarUpload({
  userId,
  organizationSlug,
  projectSlug,
  currentAvatarUrl,
  userName,
}: UserAvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(
    currentAvatarUrl || null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setIsUploading(true);
    try {
      const newAvatarUrl = await updateUserAvatar(formData);
      setPreviewImage(newAvatarUrl);
      toast({
        title: 'Avatar updated',
        description: 'Your avatar has been successfully updated.',
      });
      router.refresh();
    } catch (error) {
      console.error('Error updating avatar:', error);
      toast({
        title: 'Error',
        description: 'Failed to update avatar. Please try again.',
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
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="organizationSlug" value={organizationSlug} />
      <input type="hidden" name="projectSlug" value={projectSlug} />
      <div className="flex items-center space-x-4">
        <Avatar className="h-24 w-24">
          <AvatarImage src={previewImage || undefined} alt={userName} />
          <AvatarFallback>{userName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <h3 className="mb-2 text-lg font-medium">User Avatar</h3>
          <div className="flex items-center space-x-2">
            <input
              type="file"
              name="avatar"
              accept="image/*"
              className="sr-only"
              ref={fileInputRef}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setPreviewImage(URL.createObjectURL(file));
                  e.target.form?.requestSubmit();
                }
              }}
              aria-label="Upload new avatar"
            />
            <Button
              type="button"
              variant="outline"
              disabled={isUploading}
              onClick={handleButtonClick}
            >
              <Upload className="mr-2 h-4 w-4" />
              {isUploading ? 'Uploading...' : 'Upload new avatar'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
