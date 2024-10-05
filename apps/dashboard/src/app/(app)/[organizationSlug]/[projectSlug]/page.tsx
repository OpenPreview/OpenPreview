import { useUser } from '@openpreview/db/hooks/useUser/server';
import { Button } from '@openpreview/ui/components/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@openpreview/ui/components/card';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import Link from 'next/link';

export default async function ProjectDashboard({
  params,
}: {
  params: { organizationSlug: string; projectSlug: string };
}) {
  const { user } = await useUser();
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
