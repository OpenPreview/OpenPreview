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
import { updateUserSettings } from 'src/app/(app)/[organizationSlug]/[projectSlug]/settings/user/actions';
import * as z from 'zod';

const userFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  email: z.string().email({
    message: 'Please enter a valid email address.',
  }),
});

type UserFormValues = z.infer<typeof userFormSchema>;

interface UserFormProps {
  initialData: {
    id: string;
    name: string;
    email: string;
  };
}

export function UserForm({ initialData }: UserFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: initialData.name,
      email: initialData.email,
    },
  });

  async function onSubmit(data: UserFormValues) {
    setIsSubmitting(true);
    try {
      await updateUserSettings(initialData.id, { name: data.name });
      toast({
        title: 'User settings updated',
        description: 'Your user settings have been successfully updated.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update user settings. Please try again.',
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
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>
                This is your full name visible to other users.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} type="email" disabled />
              </FormControl>
              <FormDescription>
                This is the email address associated with your account. Contact
                support to change your email.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Updating...' : 'Update user settings'}
        </Button>
      </form>
    </Form>
  );
}
