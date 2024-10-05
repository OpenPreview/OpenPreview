'use client';

import { useSupabaseBrowser } from '@openpreview/db/client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  logo_updated_at?: string | null;
}

export function useOrganization() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = useSupabaseBrowser();
  const params = useParams();

  useEffect(() => {
    async function fetchOrganization() {
      setIsLoading(true);
      const organizationSlug = params.organizationSlug as string;

      if (!organizationSlug) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('id, name, slug, logo_url, logo_updated_at')
          .eq('slug', organizationSlug)
          .single();

        if (error) throw error;

        setOrganization(data);
      } catch (error) {
        console.error('Error fetching organization:', error);
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrganization();
  }, [supabase, params.organizationSlug, router]);

  return { organization, isLoading };
}
