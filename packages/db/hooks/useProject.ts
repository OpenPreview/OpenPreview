'use client';

import { useSupabaseBrowser } from '@openpreview/db/client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export interface Project {
  id: string;
  name: string;
  slug: string;
  organization_id: string;
  created_at: string | null;
  updated_at: string | null;
}

export function useProject() {
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = useSupabaseBrowser();
  const params = useParams();

  useEffect(() => {
    async function fetchProject() {
      setIsLoading(true);
      const projectSlug = params.projectSlug as string;

      if (!projectSlug) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('projects')
          .select('id, name, slug, organization_id, created_at, updated_at')
          .eq('slug', projectSlug)
          .single();

        if (error) throw error;

        setProject(data);
      } catch (error) {
        console.error('Error fetching project:', error);
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    }

    fetchProject();
  }, [supabase, params.projectSlug, router]);

  return { project, isLoading };
}
