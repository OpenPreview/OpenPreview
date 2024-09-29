'use server';
import 'server-only';

import { createAdminClient } from '@lib/admin';
import { createClient } from '@lib/server';
import { OpenPreviewInviteUserEmail } from '@openpreview/transactional/emails/opv-invite-user';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function inviteMember(organizationSlug: string, email: string, role: string) {
  const supabase = createClient();
  const adminClient = createAdminClient();

  // First, get the organization ID
  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, logo_url')
    .eq('slug', organizationSlug)
    .single();

  if (orgError) {
    console.error('Error fetching organization:', orgError);
    return { success: false, error: 'Failed to fetch organization' };
  }

  try {
    // Check if the user is already a member
    const { data: existingMember, error: memberError } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', organization.id)
      .eq('user:users(email)', email)
      .single();

    if (existingMember) {
      return { success: false, error: 'User is already a member of this organization' };
    }

    // Check if there's a pending invite
    const { data: existingInvite, error: inviteError } = await supabase
      .from('organization_invitations')
      .select('id')
      .eq('organization_id', organization.id)
      .eq('email', email)
      .is('accepted_at', null)
      .single();

    if (existingInvite) {
      // Reinvite the user
      const { error: updateError } = await supabase
        .from('organization_invitations')
        .update({ role, invited_by: (await supabase.auth.getUser()).data.user?.id })
        .eq('id', existingInvite.id);

      if (updateError) {
        return { success: false, error: updateError.message };
      }
    } else {
      // Create a new invitation
      const { error: newInviteError } = await supabase
        .from('organization_invitations')
        .insert({
          organization_id: organization.id,
          email,
          role,
          invited_by: (await supabase.auth.getUser()).data.user?.id,
        });

      if (newInviteError) {
        return { success: false, error: newInviteError.message };
      }
    }

    // Send the invitation email
    return await sendInvitationEmail(adminClient, supabase, organization, email, role, organizationSlug);
  } catch (error) {
    console.error('Error inviting member:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to invite member' };
  }
}

const getLocationFromIp = async (ip: string) => {
  const response = await fetch(`https://ipapi.co/${ip}/json/`);
  const data = await response.json();
  return `${data.city}, ${data.country_name}`;
}

async function sendInvitationEmail(adminClient, supabase, organization, email, role, organizationSlug) {
  // Generate the invite link using Supabase
  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.generateLink({
    type: 'invite',
    email: email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?next=/accept-org-invitation&org=${organizationSlug}`,
    },
  });

  if (inviteError) {
    throw inviteError;
  }

  // Get IP from request headers
  const headersList = headers();
  const ip = headersList.get('x-forwarded-for') || 'Unknown';

  const location = await getLocationFromIp(ip);

  // Fetch user data from the users table
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, avatar_url')
    .eq('id', (await supabase.auth.getUser()).data.user?.id)
    .single();

  if (userError) {
    console.error('Error fetching user data:', userError);
    throw userError;
  }

  // Send the invitation email using Resend
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  console.log(inviteData.properties);
  await resend.emails.send({
    from: 'OpenPreview <noreply@investa.so>',
    to: email,
    subject: `Join ${organization.name} on OpenPreview`,
    react: OpenPreviewInviteUserEmail({
      username: email.split('@')[0],
      userImage: `${baseUrl}/static/avatar-placeholder.png`,
      invitedByUsername: (await supabase.auth.getUser()).data.user?.user_metadata.full_name ?? email,
      invitedByEmail: (await supabase.auth.getUser()).data.user?.email ?? email,
      teamName: organization.name,
      teamImage: organization.logo_url ?? `${baseUrl}/static/avatar-placeholder.png`,
      inviteLink: inviteData.properties.action_link,
      inviteFromIp: ip,
      inviteFromLocation: location,
      role: role,
    }),
  });

  revalidatePath(`/[organizationSlug]/[projectSlug]/settings/members`, 'page');
  return { success: true, error: null };
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