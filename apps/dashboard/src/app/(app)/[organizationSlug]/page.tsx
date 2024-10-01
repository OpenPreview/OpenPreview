import { createClient } from '@openpreview/db/server';
import { Button } from '@openpreview/ui/components/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@openpreview/ui/components/card';
import { Plus } from 'lucide-react';
import Link from 'next/link';

interface Project {
  id: string;
  name: string;
  slug: string;
}

export default async function OrganizationPage({
  params,
}: {
  params: { organizationSlug: string };
}) {
  const supabase = createClient();

  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('slug', params.organizationSlug)
    .single();

  if (orgError) {
    console.error('Error fetching organization:', orgError);
    return <div>Error loading organization</div>;
  }

  const { data: projects, error: projError } = await supabase
    .from('projects')
    .select('id, name, slug')
    .eq('organization_id', organization.id)
    .order('name');

  if (projError) {
    console.error('Error fetching projects:', projError);
    return <div>Error loading projects</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{organization.name} Projects</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add Project
        </Button>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project: Project) => (
          <Link
            href={`/${params.organizationSlug}/${project.slug}`}
            key={project.id}
          >
            <Card className="transition-shadow duration-200 hover:shadow-lg">
              <CardHeader>
                <CardTitle>{project.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Slug: {project.slug}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
