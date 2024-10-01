'use server'

import { createClient } from '@openpreview/db/server'
import { revalidatePath } from 'next/cache'

export async function updateProjectSettings(
  projectSlug: string,
  name: string,
  allowedDomains?: { domain?: string }[]
) {
  const supabase = createClient()

  // Fetch the project first
  const { data: project, error: fetchError } = await supabase
    .from('projects')
    .select('id')
    .eq('slug', projectSlug)
    .single()

  if (fetchError) {
    console.error('Error fetching project:', fetchError)
    throw new Error(fetchError.message || 'Failed to fetch project')
  }

  if (!project) {
    throw new Error('Project not found')
  }

  // Update project name
  const { error: updateError } = await supabase
    .from('projects')
    .update({ name })
    .eq('id', project.id)

  if (updateError) {
    console.error('Error updating project:', updateError)
    throw new Error(updateError.message || 'Failed to update project settings')
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

  if (allowedDomains && allowedDomains.length > 0) {
    const { error: insertError } = await supabase
      .from('allowed_domains')
      .insert(allowedDomains.map(domain => ({ project_id: project.id, domain: domain.domain })))

    if (insertError) {
      console.error('Error inserting new domains:', insertError)
      throw new Error(insertError.message || 'Failed to update allowed domains')
    }
  }

  revalidatePath(`/[organizationSlug]/[projectSlug]/settings/project`)
}

export async function removeAllowedDomain(
  projectSlug: string,
  domain: string
) {
  const supabase = createClient()

  // Fetch the project first
  const { data: project, error: fetchError } = await supabase
    .from('projects')
    .select('id')
    .eq('slug', projectSlug)
    .single()

  if (fetchError) {
    console.error('Error fetching project:', fetchError)
    throw new Error(fetchError.message || 'Failed to fetch project')
  }

  if (!project) {
    throw new Error('Project not found')
  }

  // Remove the specified domain
  const { error: removeError } = await supabase
    .from('allowed_domains')
    .delete()
    .eq('project_id', project.id)
    .eq('domain', domain)

  if (removeError) {
    console.error('Error removing domain:', removeError)
    throw new Error(removeError.message || 'Failed to remove allowed domain')
  }

  revalidatePath(`/[organizationSlug]/[projectSlug]/settings/project`)
}
