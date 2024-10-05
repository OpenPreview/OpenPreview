'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useSupabaseBrowser } from '@openpreview/db/client';
import { useUser } from '@openpreview/db/hooks/useUser/client';
import { Button } from '@openpreview/ui/components/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@openpreview/ui/components/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@openpreview/ui/components/form';
import { Input } from '@openpreview/ui/components/input';
import { Skeleton } from '@openpreview/ui/components/skeleton';
import { useToast } from '@openpreview/ui/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { fetchPendingInvites } from 'src/components/dashboard/actions';
import {
  InviteList,
  PendingInvite,
} from 'src/components/dashboard/InvitesList';
import * as z from 'zod';

const organizationSchema = z.object({
  organizationName: z
    .string()
    .min(2, { message: 'Organization name must be at least 2 characters' }),
});

const projectSchema = z.object({
  projectName: z
    .string()
    .min(2, { message: 'Project name must be at least 2 characters' }),
  domain: z.string().url({ message: 'Please enter a valid URL' }),
});

type OrganizationFormValues = z.infer<typeof organizationSchema>;
type ProjectFormValues = z.infer<typeof projectSchema>;

function OrganizationForm({
  onSubmit,
  isLoading,
}: {
  onSubmit: (data: OrganizationFormValues) => Promise<void>;
  isLoading: boolean;
}) {
  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      organizationName: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="organizationName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organization Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter your organization name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Organization'}
        </Button>
      </form>
    </Form>
  );
}

function ProjectForm({
  onSubmit,
  isLoading,
}: {
  onSubmit: (data: ProjectFormValues) => Promise<void>;
  isLoading: boolean;
}) {
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      projectName: '',
      domain: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="projectName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter your project name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="domain"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Domain</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Project'}
        </Button>
      </form>
    </Form>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

export default function OnboardingPage() {
  const { user, authUser } = useUser();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[] | null>(
    null,
  );
  const [organizationSlug, setOrganizationSlug] = useState('');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = useSupabaseBrowser();

  useEffect(() => {
    async function checkExistingOrganization() {
      try {
        const { pendingInvites, error: inviteError } =
          await fetchPendingInvites();
        if (inviteError) {
          throw new Error(inviteError);
        }
        if (pendingInvites && pendingInvites.length > 0) {
          setPendingInvites(pendingInvites);
          return;
        }

        const { data: organizations, error } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .limit(1);

        if (error) {
          console.error('Error checking existing organization:', error);
          return;
        }

        if (organizations && organizations.length > 0) {
          // User already has an organization, skip to project creation
          setStep(2);
          const { data: org } = await supabase
            .from('organizations')
            .select('slug')
            .eq('id', organizations[0].organization_id)
            .single();
          if (org) {
            setOrganizationSlug(org.slug);
          }
        }
      } catch (error) {
        console.error('Error during initial loading:', error);
      } finally {
        setIsInitialLoading(false);
      }
    }

    checkExistingOrganization();
  }, [supabase]);

  async function onOrganizationSubmit(data: OrganizationFormValues) {
    setIsLoading(true);
    try {
      const { data: organization, error: orgError } = await supabase
        .from('organizations')
        .insert({ name: data.organizationName })
        .select()
        .single();

      if (orgError) {
        if (orgError.message.includes('row-level security policy')) {
          throw new Error(
            'Permission denied: Unable to create organization. Please check your authentication status or contact support.',
          );
        }
        throw new Error('Failed to create organization: ' + orgError.message);
      }

      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: organization.id,
          user_id: user.id,
          role: 'owner',
        });

      if (memberError)
        throw new Error(
          'Failed to add member to organization: ' + memberError.message,
        );

      setOrganizationSlug(organization.slug);
      setStep(2);
    } catch (error) {
      console.error('Organization creation error:', error);
      toast({
        title: 'Organization Creation Failed',
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function onProjectSubmit(data: ProjectFormValues) {
    setIsLoading(true);
    try {
      const { data: organization, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', organizationSlug)
        .single();

      if (orgError)
        throw new Error('Failed to fetch organization: ' + orgError.message);

      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({ name: data.projectName, organization_id: organization.id })
        .select()
        .single();

      if (projectError)
        throw new Error('Failed to create project: ' + projectError.message);

      const { error: memberError } = await supabase
        .from('project_members')
        .insert({ project_id: project.id, user_id: user.id, role: 'owner' });

      if (memberError)
        throw new Error(
          'Failed to add member to project: ' + memberError.message,
        );

      const { error: domainError } = await supabase
        .from('allowed_domains')
        .insert({ domain: data.domain, project_id: project.id });

      if (domainError)
        throw new Error('Failed to add allowed domain: ' + domainError.message);

      const { error: userUpdateError } = await supabase
        .from('users')
        .update({ onboarding_completed: true })
        .eq('id', user.id);

      if (userUpdateError)
        throw new Error(
          'Failed to update user onboarding status: ' + userUpdateError.message,
        );

      toast({
        title: 'Onboarding Complete',
        description:
          'Your organization and project have been created successfully.',
      });
      router.push(`/${organizationSlug}/${project.slug}`);
    } catch (error) {
      console.error('Project creation error:', error);
      toast({
        title: 'Project Creation Failed',
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="container mx-auto max-w-md py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Welcome to OpenPreview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-gray-600">
            OpenPreview is an open-source toolkit for streamlined development,
            collaborative comments, and efficient project management—anytime,
            anywhere.
          </p>
          {isInitialLoading ? (
            <LoadingSkeleton />
          ) : step === 1 ? (
            <OrganizationForm
              onSubmit={onOrganizationSubmit}
              isLoading={isLoading}
            />
          ) : (
            <ProjectForm onSubmit={onProjectSubmit} isLoading={isLoading} />
          )}
          {step === 1 && pendingInvites && pendingInvites.length > 0 && (
            <InviteList user={authUser} pendingInvites={pendingInvites} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
