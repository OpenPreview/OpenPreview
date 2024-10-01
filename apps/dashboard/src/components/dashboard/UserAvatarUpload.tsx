'use client';

import { useSupabaseBrowser } from '@openpreview/db/client';
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

interface UserAvatarUploadProps {
  userId: string;
  currentAvatarUrl?: string;
  userName: string;
}

export function UserAvatarUpload({
  userId,
  currentAvatarUrl,
  userName,
}: UserAvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(
    currentAvatarUrl || null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = useSupabaseBrowser();
  const router = useRouter();

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const formData = new FormData();
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = e => {
      setPreviewImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('user_avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('user_avatars').getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', userId)
        .select();

      if (updateError) throw updateError;

      setPreviewImage(publicUrl);
      toast({
        title: 'Avatar updated',
        description: 'Your avatar has been successfully updated.',
      });

      // Refresh the page after successful upload
      router.refresh();
    } catch (error) {
      console.error('Error updating avatar:', error);
      toast({
        title: 'Error',
        description: 'Failed to update avatar. Please try again.',
        variant: 'destructive',
      });
      setPreviewImage(currentAvatarUrl || null);
    } finally {
      setIsUploading(false);
    }
  }

  function handleButtonClick() {
    fileInputRef.current?.click();
  }

  return (
    <div className="flex items-center space-x-4">
      <Avatar className="h-24 w-24">
        <AvatarImage src={previewImage || undefined} alt={userName} />
        <AvatarFallback>
          {userName ? userName.slice(0, 2).toUpperCase() : 'U'}
        </AvatarFallback>
      </Avatar>
      <div>
        <h3 className="mb-2 text-lg font-medium">User Avatar</h3>
        <div className="flex items-center space-x-2">
          <input
            type="file"
            accept="image/*"
            disabled={isUploading}
            className="sr-only"
            ref={fileInputRef}
            onChange={handleFileChange}
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
  );
}
