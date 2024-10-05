import { createClient } from '@openpreview/db/server';


export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  logo_updated_at?: string | null;
}

export async function fetchOrganizations(): Promise<Organization[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, slug, logo_url, logo_updated_at');

  if (error) {
    console.error('Error fetching organizations:', error);
    return [];
  }

  return data;
}
