'use server'

import { createClient } from '@openpreview/db/server'
import { revalidatePath } from 'next/cache'
import { v4 as uuidv4 } from 'uuid'

export async function updateOrganizationSettings(
  organizationSlug: string,
  projectSlug: string,
  name: string,
) {
  const supabase = createClient()

  const { error } = await supabase
    .from('organizations')
    .update({ name })
    .eq('slug', organizationSlug)

  if (error) {
    console.error('Error updating organization:', error)
    throw new Error('Failed to update organization settings')
  }

  revalidatePath(`/[organizationSlug]/[projectSlug]/settings/organization`, 'layout')
}

export async function updateOrganizationLogo(formData: FormData) {
  const supabase = createClient()

  const file = formData.get('logo') as File
  const organizationSlug = formData.get('organizationSlug') as string
  const projectSlug = formData.get('projectSlug') as string

  if (!file) {
    throw new Error('No logo file provided')
  }

  const fileExt = file.name.split('.').pop()
  const fileName = `${uuidv4()}.${fileExt}`

  try {
    const { error: uploadError } = await supabase.storage
      .from('organization_logos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('organization_logos')
      .getPublicUrl(fileName)

    const { error: updateError } = await supabase
      .from('organizations')
      .update({ logo_url: publicUrl })
      .eq('slug', organizationSlug)

    if (updateError) throw updateError

    revalidatePath(`/[organizationSlug]/[projectSlug]/settings/organization`, 'layout')

    return publicUrl
  } catch (error) {
    console.error('Error updating organization logo:', error)
    throw new Error('Failed to update organization logo')
  }
}
