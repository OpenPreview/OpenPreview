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
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { updateOrganizationSettings } from '../../app/(app)/[organizationSlug]/[projectSlug]/settings/organization/actions';

const organizationFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Organization name must be at least 2 characters.',
  }),
});

type OrganizationFormValues = z.infer<typeof organizationFormSchema>;

interface OrganizationFormProps {
  initialData: {
    name: string;
    slug: string;
    logo_url?: string;
  };
  projectSlug: string;
}

export function OrganizationForm({
  initialData,
  projectSlug,
}: OrganizationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      name: initialData.name,
    },
  });

  async function onSubmit(data: OrganizationFormValues) {
    setIsSubmitting(true);
    try {
      await updateOrganizationSettings(
        initialData.slug,
        projectSlug,
        data.name,
      );
      toast({
        title: 'Organization settings updated',
        description:
          'Your organization settings have been successfully updated.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description:
          'Failed to update organization settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <OrganizationFormFields
        form={form}
        onSubmit={onSubmit}
        isSubmitting={isSubmitting}
        initialSlug={initialData.slug}
      />
    </div>
  );
}

interface OrganizationFormFieldsProps {
  form: ReturnType<typeof useForm<OrganizationFormValues>>;
  onSubmit: (data: OrganizationFormValues) => Promise<void>;
  isSubmitting: boolean;
  initialSlug: string;
}

function OrganizationFormFields({
  form,
  onSubmit,
  isSubmitting,
  initialSlug,
}: OrganizationFormFieldsProps) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organization Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>
                This is your organization's display name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormItem>
          <FormLabel>Organization Slug</FormLabel>
          <FormControl>
            <Input value={initialSlug} disabled />
          </FormControl>
          <FormDescription>
            This is your organization's URL-friendly name. It cannot be changed.
          </FormDescription>
        </FormItem>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Updating...' : 'Update organization'}
        </Button>
      </form>
    </Form>
  );
}
