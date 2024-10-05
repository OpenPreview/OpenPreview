'use server';
import 'server-only';

import { createAdminClient } from '@openpreview/db/admin';
import { createClient } from '@openpreview/db/server';
import { OpenPreviewInviteUserEmail } from '@openpreview/transactional/emails/opv-invite-user';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function inviteMember(organizationSlug: string, email: string, role: string) {
  const supabase = createClient();
  const adminClient = createAdminClient();

  // Fetch the organization
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

    // Check if the user exists on the platform
    const { data: existingUser, error: userError } = await adminClient
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    // Send invitation email
    await sendInvitationEmail(adminClient, supabase, organization, email, role, organizationSlug, existingUser !== null);

    // Create or update the invitation in the database
    const { error: inviteError } = await supabase
      .from('organization_invitations')
      .upsert({
        organization_id: organization.id,
        email,
        role,
        invited_by: (await supabase.auth.getUser()).data.user?.id,
      }, {
        onConflict: 'organization_id, email',
        ignoreDuplicates: false,
      });

    if (inviteError) {
      return { success: false, error: inviteError.message };
    }

    revalidatePath(`/[organizationSlug]/[projectSlug]/settings/members`, 'page');
    return { success: true, error: null };
  } catch (error) {
    console.error('Error inviting member:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to invite member' };
  }
}

async function sendInvitationEmail(adminClient, supabase, organization, email, role, organizationSlug, isExistingUser) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  const inviter = (await supabase.auth.getUser()).data.user;

  let inviteLink;
  if (isExistingUser) {
    inviteLink = `${baseUrl}/accept-org-invitation?org=${organizationSlug}`;
  } else {
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.generateLink({
      type: 'invite',
      email: email,
      options: {
        redirectTo: `${baseUrl}/auth/confirm?next=/accept-org-invitation&org=${organizationSlug}&email=${email}`,
      },
    });

    if (inviteError) {
      throw inviteError;
    }

    inviteLink = inviteData.properties.action_link;
  }

  // Get IP from request headers
  const headersList = headers();
  const ip = headersList.get('x-forwarded-for') || 'Unknown';
  const location = await getLocationFromIp(ip);

  await resend.emails.send({
    from: 'OpenPreview <noreply@investa.so>',
    to: email,
    subject: `Join ${organization.name} on OpenPreview`,
    react: OpenPreviewInviteUserEmail({
      username: email.split('@')[0],
      userImage: `${baseUrl}/static/avatar-placeholder.png`,
      invitedByUsername: inviter?.user_metadata.full_name ?? inviter?.email ?? email,
      invitedByEmail: inviter?.email ?? email,
      teamName: organization.name,
      teamImage: organization.logo_url ?? `${baseUrl}/static/avatar-placeholder.png`,
      inviteLink: inviteLink,
      inviteFromIp: ip,
      inviteFromLocation: location,
      role: role,
    }),
  });

  return { success: true, error: null };
}

const getLocationFromIp = async (ip: string) => {
  const response = await fetch(`https://ipapi.co/${ip}/json/`);
  const data = await response.json();
  return `${data.city}, ${data.country_name}`;
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

export async function handleSignOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/');
}
export async function acceptInvite({
  organizationId,
  organizationSlug,
}:{
  organizationId?: string;
  organizationSlug?: string;
}) {

  if (!organizationId && !organizationSlug) 
    return {
    success: false,
    error: `Missing ${!organizationId ? 'Organization ID' : 'Organization Slug'}`
  }
  
  const supabase = createClient();
  const adminClient = createAdminClient()
  const { data: {user} } = await supabase.auth.getUser();
  if (!user && organizationSlug) return redirect( `/register?redirect=/accept-org-invitation?org=${organizationSlug}`)
    else if (!user && !organizationSlug) return redirect('/login');
  // First, get the organization ID 
  const { data: organization, error: orgError } = await adminClient
    .from('organizations')
    .select('id')
    .eq(organizationId ? 'id' : 'slug', organizationId ? organizationId : organizationSlug)
    .single();

  if (orgError) {
    console.error('Error fetching organization:', orgError);
    throw new Error('Failed to fetch organization');
  }

  try {
    // Check if the user is already a member
    const { data: existingMember, error: memberError } = await adminClient
      .from('organization_members')
      .select('id')
      .eq('organization_id', organization.id)
      .eq('user_id', user.id)
      .single();

    if (existingMember) {
      return { success: false, error: 'User is already a member of this organization' };
    }

    // Check if there's a pending invite
    const { data: existingInvite, error: inviteError } = await adminClient
      .from('organization_invitations')
      .select('id, role')
      .eq('organization_id', organization.id)
      .eq('email', user.email)
      .is('accepted_at', null)
      .single();

    if (existingInvite) {
      // Accept invite in db
      const { error: updateError } = await adminClient
        .from('organization_invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', existingInvite.id);

      if (updateError) {
        return { success: false, error: updateError.message };
      }
    } else {
      throw new Error('No pending invitation found');
    }

    const { error: orgMemberError } = await adminClient
      .from('organization_members')
      .insert({
        organization_id: organization.id,
        user_id: user.id,
        role: existingInvite.role,
      });

      const { error: obCompleteError } = await supabase
        .from('users')
        .update({
          onboarding_completed: true,
        })
        .eq('id', user.id);

      if (obCompleteError) {
        return { success: false, error: memberError.message };
      }

    if (orgMemberError) {
      return { success: false, error: memberError.message };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error inviting member:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to invite member' };
  }
}

export async function fetchPendingInvites() {
  const supabase = createClient();
  const adminClient = createAdminClient();

  const { data: {user}} = await supabase.auth.getUser();
  if (!user) throw new Error('User not found');

  const { data: organizationInvite, error: inviteError } = await adminClient
    .from('organization_invitations')
    .select('id, organizations(*), role')
    .eq('email', user.email)
    .is('accepted_at', null)
    
    if (inviteError || !organizationInvite) {
     return { pendingInvites: null, error: inviteError?.message };
    }

    return { pendingInvites: organizationInvite, error: null };
  }