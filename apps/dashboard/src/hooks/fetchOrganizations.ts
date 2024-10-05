'use client';

import { useSupabaseBrowser } from '@openpreview/db/client';
import { useEffect, useState } from 'react';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  logo_updated_at?: string;
}

export function useFetchOrganizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = useSupabaseBrowser();

  useEffect(() => {
    async function fetchOrganizations() {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('id, name, slug, logo_url, logo_updated_at');

        if (error) throw error;

        setOrganizations(data);
      } catch (err) {
        console.error('Error fetching organizations:', err);
        setError(err instanceof Error ? err : new Error('An unknown error occurred'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrganizations();
  }, [supabase]);

  return { organizations, isLoading, error };
}
