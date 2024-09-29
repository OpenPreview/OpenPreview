'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@openpreview/ui/components/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@openpreview/ui/components/form';
import { Input } from '@openpreview/ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openpreview/ui/components/select';
import { useToast } from '@openpreview/ui/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { inviteMember } from './actions';

const formSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  role: z.enum(['viewer', 'editor', 'admin', 'owner'], {
    required_error: 'Please select a role',
  }),
});

interface InviteMemberFormProps {
  organizationSlug: string;
}

export function InviteMemberForm({ organizationSlug }: InviteMemberFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      role: 'viewer',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const result = await inviteMember(
        organizationSlug,
        values.email,
        values.role,
      );
      if (result.success) {
        toast({
          title: 'Invitation sent',
          description: `An invitation has been sent to ${values.email}.`,
        });
        form.reset();
      } else {
        throw new Error(result.error || 'Failed to send invitation');
      }
      router.refresh();
    } catch (error) {
      console.error('Error inviting member:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to send invitation. Please try again.',
        variant: 'destructive',
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <h4 className="text-md font-medium">Invite New Member</h4>
        <div className="flex space-x-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input placeholder="Email address" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit">Invite</Button>
        </div>
      </form>
    </Form>
  );
}
