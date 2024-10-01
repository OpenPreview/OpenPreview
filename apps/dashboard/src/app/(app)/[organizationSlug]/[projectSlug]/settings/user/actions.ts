'use server'

import { createClient } from '@openpreview/db/server'
import { revalidatePath } from 'next/cache'
import { v4 as uuidv4 } from 'uuid'

export async function updateUserSettings(
  userId: string,
  { name }: { name: string }
) {
  const supabase = createClient()

  const { error } = await supabase
    .from('users')
    .update({ name })
    .eq('id', userId)

  if (error) {
    console.error('Error updating user settings:', error)
    throw new Error('Failed to update user settings')
  }

  revalidatePath('/settings/user')
}

export async function updateUserAvatar(formData: FormData) {
  const supabase = createClient()

  const file = formData.get('avatar') as File
  const userId = formData.get('userId') as string
  const organizationSlug = formData.get('organizationSlug') as string
  const projectSlug = formData.get('projectSlug') as string

  if (!file) {
    throw new Error('No avatar file provided')
  }

  const fileExt = file.name.split('.').pop()
  const fileName = `${uuidv4()}.${fileExt}`

  try {
    const { error: uploadError } = await supabase.storage
      .from('user_avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('user_avatars')
      .getPublicUrl(fileName)

    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: publicUrl })
      .eq('id', userId)

    if (updateError) throw updateError

    revalidatePath(`/${organizationSlug}/${projectSlug}/settings/user`)

    return publicUrl
  } catch (error) {
    console.error('Error updating user avatar:', error)
    throw new Error('Failed to update user avatar')
  }
}