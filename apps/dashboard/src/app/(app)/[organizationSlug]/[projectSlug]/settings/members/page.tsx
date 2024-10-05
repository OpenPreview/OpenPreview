import { useUser } from '@openpreview/db/hooks/useUser/server';
import { createClient } from '@openpreview/db/server';
import { Separator } from '@openpreview/ui/components/separator';
import { Metadata } from 'next';
import { InviteMemberForm } from 'src/components/dashboard/InviteMemberForm';
import { MembersList } from 'src/components/dashboard/MembersList';

export const metadata: Metadata = {
  title: 'Organization Members',
  description: 'Manage your organization members.',
};

async function getOrganizationMembers(organizationSlug: string) {
  const supabase = createClient();

  const { data: members, error: orgError } = await supabase
    .from('organizations')
    .select(
      'id, organization_members(id, role,user:users(id, name, email, avatar_url))',
    )
    .eq('slug', organizationSlug)
    .single();

  if (orgError) {
    console.error('Error fetching organization:', orgError);
    throw new Error('Failed to fetch organization');
  }

  return members;
}

async function getPendingInvites(organizationSlug: string) {
  const supabase = createClient();

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

  const organizationId = organization.id;

  // Then, fetch pending invites using the organization ID
  const { data: pendingInvites, error: inviteError } = await supabase
    .from('organization_invitations')
    .select('id, email, role')
    .eq('organization_id', organizationId)
    .is('accepted_at', null);

  if (inviteError) {
    console.error('Error fetching pending invites:', inviteError);
    throw new Error('Failed to fetch pending invites');
  }

  return pendingInvites;
}

async function getCurrentUserId() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id;
}

export default async function OrganizationMembersPage({
  params,
}: {
  params: { organizationSlug: string; projectSlug: string };
}) {
  const { user } = await useUser();
  const members = await getOrganizationMembers(params.organizationSlug);
  const pendingInvites = await getPendingInvites(params.organizationSlug);
  const currentUserId = await getCurrentUserId();

  return (
    <div className="space-y-6 border-l p-4">
      <div>
        <h3 className="text-lg font-medium">Organization Members</h3>
        <p className="text-muted-foreground text-sm">
          Manage your organization's members and their roles.
        </p>
      </div>
      <Separator />
      <MembersList
        members={members.organization_members}
        currentUserId={currentUserId}
        pendingInvites={pendingInvites}
        organizationSlug={params.organizationSlug}
      />
      <Separator />
      <InviteMemberForm organizationSlug={params.organizationSlug} />
    </div>
  );
}
