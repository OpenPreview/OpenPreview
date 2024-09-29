'use server';
import 'server-only';

import { createAdminClient } from '@lib/admin';
import { createClient } from '@lib/server';
import { revalidatePath } from 'next/cache';

export async function inviteMember(organizationSlug: string, email: string, role: string) {
  const supabase = createClient();
  const adminClient = createAdminClient();

  // First, get the organization ID
  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', organizationSlug)
    .single();

  if (orgError) {
    console.error('Error fetching organization:', orgError);
    throw new Error('Failed to fetch organization');
  }

  try {
    // Generate the redirect URL for the invitation
    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?next=/accept-org-invitation&org=${organizationSlug}`;

    // Invite the user to the platform using the admin client
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, { redirectTo });

    if (inviteError) {
      throw inviteError;
    }

    // Create the organization invitation
    const { error: orgInviteError } = await supabase
      .from('organization_invitations')
      .insert({
        organization_id: organization.id,
        email,
        role,
        invited_by: (await supabase.auth.getUser()).data.user?.id,
      });

    if (orgInviteError) {
      throw orgInviteError;
    }

    revalidatePath(`/${organizationSlug}/settings/members`);
    return { success: true };
  } catch (error) {
    console.error('Error inviting member:', error);
    return { success: false, error: 'Failed to invite member' };
  }
}

export async function updateMemberRole(formData: FormData) {
  const supabase = createClient();
  
  const memberId = formData.get('memberId') as string;
  const newRole = formData.get('role') as string;

  try {
    const { error } = await supabase
      .from('organization_members')
      .update({ role: newRole })
      .eq('id', memberId);

    if (error) throw error;

    revalidatePath('/[organizationSlug]/settings/members');
    return { success: true };
  } catch (error) {
    console.error('Error updating member role:', error);
    return { success: false, error: 'Failed to update member role' };
  }
}