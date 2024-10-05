'use client';

import { useSupabaseBrowser } from '@openpreview/db/client';


export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  logo_updated_at?: string | null;
}

export async function getOrganization(slug: string): Promise<Organization | null> {
  const supabase = useSupabaseBrowser();

  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, slug, logo_url, logo_updated_at')
    .eq('slug', slug)
    .single();

  if (error) {
    console.error('Error fetching organization:', error);
    return null;
  }

  return data;
}
