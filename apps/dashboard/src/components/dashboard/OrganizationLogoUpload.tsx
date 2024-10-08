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

interface OrganizationLogoUploadProps {
  organizationSlug: string;
  currentLogoUrl?: string;
  organizationName: string;
}

export function OrganizationLogoUpload({
  organizationSlug,
  currentLogoUrl,
  organizationName,
}: OrganizationLogoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(
    currentLogoUrl || null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = useSupabaseBrowser();

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      return;
    }
    setIsUploading(true);

    // Create a preview of the selected image
    const reader = new FileReader();
    reader.onload = e => {
      setPreviewImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Convert image to PNG
      const pngBlob = await convertToPNG(file);
      const pngFile = new File([pngBlob], `${file.name}.png`, {
        type: 'image/png',
      });

      const fileName = `${organizationSlug}.png`;

      // Upload file to 'organization_logos' bucket
      const { error: uploadError } = await supabase.storage
        .from('organization_logos')
        .upload(fileName, pngFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('organization_logos').getPublicUrl(fileName);

      // Update organization record
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          logo_url: `${publicUrl}?t=${new Date(Date.now() + 60000).toISOString()}`,
        })
        .eq('slug', organizationSlug)
        .select();

      if (updateError) throw updateError;

      setPreviewImage(
        `${publicUrl}?t=${new Date(Date.now() + 60000).toISOString()}`,
      );
      toast({
        title: 'Logo updated',
        description: 'Your organization logo has been successfully updated.',
      });
      // Refresh the page after successful upload
      router.refresh();
    } catch (error) {
      console.error('Error updating logo:', error);
      toast({
        title: 'Error',
        description: 'Failed to update organization logo. Please try again.',
        variant: 'destructive',
      });
      // Revert to the previous logo if there's an error
      setPreviewImage(currentLogoUrl || null);
    } finally {
      setIsUploading(false);
    }
  }

  function handleButtonClick() {
    fileInputRef.current?.click();
  }

  // Function to convert image to PNG
  async function convertToPNG(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(blob => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert image to PNG'));
          }
        }, 'image/png');
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  return (
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
            accept="image/*"
            disabled={isUploading}
            className="sr-only"
            ref={fileInputRef}
            onChange={handleFileChange}
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
  );
}
