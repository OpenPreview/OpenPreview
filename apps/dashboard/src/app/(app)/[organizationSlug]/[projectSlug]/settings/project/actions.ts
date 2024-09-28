'use server'

import { createClient } from '@lib/server'
import { revalidatePath } from 'next/cache'

export async function updateProjectSettings(
  projectSlug: string,
  name: string,
  allowedDomains?: { domain?: string }[]
) {
  const supabase = createClient()

  // Start a transaction
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .update({ name })
    .eq('slug', projectSlug)
    .select()
    .single()

  if (projectError) {
    console.error('Error updating project:', projectError)
    throw new Error('Failed to update project settings')
  }

  // Update allowed domains
  const { error: domainsError } = await supabase
    .from('allowed_domains')
    .delete()
    .eq('project_id', project.id)

  if (domainsError) {
    console.error('Error deleting old domains:', domainsError)
    throw new Error('Failed to update allowed domains')
  }

  const { error: insertError } = await supabase
    .from('allowed_domains')
    .insert(allowedDomains.map(domain => ({ project_id: project.id, domain: domain.domain })))

  if (insertError) {
    console.error('Error inserting new domains:', insertError)
    throw new Error('Failed to update allowed domains')
  }

  revalidatePath(`/${projectSlug}/settings/project`)
}