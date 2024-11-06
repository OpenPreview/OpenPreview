import { useUser } from '@openpreview/db/hooks/useUser/server';
import { createClient } from '@openpreview/db/server';
import { Button } from '@openpreview/ui/components/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@openpreview/ui/components/card';
import { ArrowLeft, MessageSquare, SquareArrowUpRight } from 'lucide-react';
import Link from 'next/link';

async function getProjectSettings(projectSlug: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('projects')
    .select('name, slug, allowed_domains(domain)')
    .eq('slug', projectSlug)
    .single();

  if (error) {
    console.error('Error fetching project settings:', error);
    throw new Error(error.message || 'Failed to fetch project settings');
  }

  return data;
}

export default async function ProjectDashboard({
  params,
}: {
  params: { organizationSlug: string; projectSlug: string };
}) {
  const { user } = await useUser();
  const projectSettings = await getProjectSettings(params.projectSlug);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Project Dashboard</h1>
        <Link href={`/${params.organizationSlug}`}>
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Projects
          </Button>
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {projectSettings.allowed_domains.map(({ domain }) => (
          <Link href={`${domain}/?opv_user_id=${user.id}`}>
            Go to{' '}
            <span className="text-blue-400">{new URL(domain).hostname}</span>
            <SquareArrowUpRight className="ml-2 h-4 w-4" />
          </Link>
        ))}
      </div>
      <p className="text-gray-600">
        Organization: {params.organizationSlug}, Project: {params.projectSlug}
      </p>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">24</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">8</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">65%</p>
          </CardContent>
        </Card>
      </div>
      <div className="flex justify-end">
        <Link
          href={`/${params.organizationSlug}/${params.projectSlug}/comments`}
        >
          <Button>
            <MessageSquare className="mr-2 h-4 w-4" /> View Comments
          </Button>
        </Link>
      </div>
    </div>
  );
}
