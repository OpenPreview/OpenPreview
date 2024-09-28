'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@openpreview/ui/components/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@openpreview/ui/components/form';
import { Input } from '@openpreview/ui/components/input';
import { toast } from '@openpreview/ui/hooks/use-toast';
import { Globe, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { updateProjectSettings } from '../../app/(app)/[organizationSlug]/[projectSlug]/settings/project/actions';

const projectFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Project name must be at least 2 characters.',
  }),
  allowedDomains: z
    .array(
      z.object({
        domain: z.string().url({
          message: 'Please enter a valid URL.',
        }),
      }),
    )
    .min(1, {
      message: 'At least one domain is required.',
    }),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface ProjectFormProps {
  initialData: {
    name: string;
    slug: string;
    allowed_domains: {
      domain: string;
    }[];
  };
}

export function ProjectForm({ initialData }: ProjectFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: initialData.name,
      allowedDomains: initialData.allowed_domains,
    },
  });

  async function onSubmit(data: ProjectFormValues) {
    setIsSubmitting(true);
    try {
      await updateProjectSettings(
        initialData.slug,
        data.name,
        data.allowedDomains,
      );
      toast({
        title: 'Project settings updated',
        description: 'Your project settings have been successfully updated.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update project settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>
                This is your project's display name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="allowedDomains"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Allowed Domains</FormLabel>
              <FormControl>
                <div className="space-y-2">
                  {field.value.map((domain, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="w-6 flex-shrink-0">
                        <Favicon domain={domain.domain} />
                      </div>
                      <Input
                        value={domain.domain}
                        onChange={e => {
                          const newDomains = [...field.value];
                          newDomains[index] = { domain: e.target.value };
                          field.onChange(newDomains);
                        }}
                        placeholder={
                          index === 0
                            ? 'Main domain (required)'
                            : 'https://example.com'
                        }
                        className="flex-grow"
                      />
                      {index !== 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newDomains = field.value.filter(
                              (_, i) => i !== index,
                            );
                            field.onChange(newDomains);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      field.onChange([...field.value, { domain: '' }])
                    }
                  >
                    Add Domain
                  </Button>
                </div>
              </FormControl>
              <FormDescription>
                The domains where your project is allowed to run. The first
                domain is the main domain and cannot be removed, but it can be
                changed.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormItem>
          <FormLabel>Project Slug</FormLabel>
          <FormControl>
            <Input value={initialData.slug} disabled />
          </FormControl>
          <FormDescription>
            This is your project's URL-friendly name. It cannot be changed.
          </FormDescription>
        </FormItem>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Updating...' : 'Update project'}
        </Button>
      </form>
    </Form>
  );
}

const Favicon = ({ domain }: { domain: string }) => {
  const [imgSrc, setImgSrc] = useState<string | null>(null);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (isValidUrl(domain)) {
        setImgSrc(`https://www.google.com/s2/favicons?domain=${domain}&sz=64`);
      } else {
        setImgSrc(null);
      }
    }, 300); // 300ms debounce delay

    return () => clearTimeout(debounceTimer);
  }, [domain]);

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="flex h-6 w-6 items-center justify-center">
      {imgSrc ? (
        <Image
          src={imgSrc}
          alt={`Favicon for ${domain}`}
          width={24}
          height={24}
          className="rounded shadow-sm"
          onError={() => setImgSrc(null)}
        />
      ) : (
        <Globe className="h-6 w-6" />
      )}
    </div>
  );
};
