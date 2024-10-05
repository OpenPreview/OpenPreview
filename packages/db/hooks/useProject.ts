'use client';

import { useSupabaseBrowser } from '@openpreview/db/client';


export interface Project {
  id: string;
  name: string;
  slug: string;
  organization_id: string;
  created_at: string | null;
  updated_at: string | null;
}

export async function getProject(slug: string): Promise<Project | null> {
  const supabase = useSupabaseBrowser();

  const { data, error } = await supabase
    .from('projects')
    .select('id, name, slug, organization_id, created_at, updated_at')
    .eq('slug', slug)
    .single();

  if (error) {
    console.error('Error fetching project:', error);
    return null;
  }

  return data;
}
