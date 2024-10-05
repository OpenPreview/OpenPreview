
'use client';

import { useSupabaseBrowser } from '@openpreview/db/client';
import { useEffect, useState } from 'react';

export interface Project {
  id: string;
  name: string;
  slug: string;
  organization_id: string 
  created_at: string | null;
  updated_at: string | null;
}

export function useFetchProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = useSupabaseBrowser();

  useEffect(() => {
    async function fetchProjects() {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from('projects')
          .select('id, name, slug, organization_id, created_at, updated_at');

        if (error) throw error;

        setProjects(data);
      } catch (err) {
        console.error('Error fetching projects:', err);
        setError(err instanceof Error ? err : new Error('An unknown error occurred'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchProjects();
  }, [supabase]);

  return { projects, isLoading, error };
}
