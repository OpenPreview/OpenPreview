'use client';

import { useRouter, useParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@openpreview/ui/components/select";

interface Project {
  id: string;
  name: string;
  slug: string;
  organizations: {
    id: string;
    slug: string;
  };
}

interface ProjectSelectorProps {
  projects: Project[];
}

export function ProjectSelector({ projects }: ProjectSelectorProps) {
  const router = useRouter();
  const params = useParams();
  const organizationSlug = params.organizationSlug as string;

  const filteredProjects = projects.filter(
    (project) => project.organizations.slug === organizationSlug
  );

  const handleProjectChange = (slug: string) => {
    router.push(`/${organizationSlug}/${slug}`);
  };

  return (
    <div className="mb-4">
      <label htmlFor="project" className="block text-sm font-medium text-gray-700 mb-1">
        Project
      </label>
      <Select onValueChange={handleProjectChange} disabled={!organizationSlug}>
        <SelectTrigger id="project">
          <SelectValue placeholder={organizationSlug ? "Select project" : "Select organization first"} />
        </SelectTrigger>
        <SelectContent>
          {filteredProjects.map((project) => (
            <SelectItem key={project.id} value={project.slug}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
