'use client';

import { useSupabaseBrowser } from '@openpreview/db/client';
import { useUser } from '@openpreview/db/hooks/useUser/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function AcceptOrgInvitationContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = useSupabaseBrowser();
  const searchParams = useSearchParams();

  useEffect(() => {
    async function handleInvitation() {
      try {
        const orgSlug = searchParams.get('org');
        if (!orgSlug) {
          throw new Error('Invalid invitation link');
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push(
            `/register?redirect=/accept-org-invitation?org=${orgSlug}`,
          );
          return;
        }

        const { data: invitation, error: inviteError } = await supabase
          .from('organization_invitations')
          .select('id, organization_id, role')
          .eq('email', user.email)
          .is('accepted_at', null)
          .single();

        console.log('invitation', invitation, inviteError);

        if (inviteError || !invitation) {
          throw new Error('No pending invitation found');
        }

        const now = new Date().toISOString();

        const { error: acceptError } = await supabase
          .from('organization_invitations')
          .update({ accepted_at: now })
          .eq('id', invitation.id);

        if (acceptError) {
          throw new Error('Failed to accept invitation');
        }

        const { error: memberError } = await supabase
          .from('organization_members')
          .insert({
            organization_id: invitation.organization_id,
            user_id: user.id,
            role: invitation.role,
          });

        // check off onboarding
        const { error: onboardingError } = await supabase
          .from('users')
          .update({
            onboarding_completed: true,
          })
          .eq('id', user.id);

        if (onboardingError) {
          throw new Error('Failed to update onboarding status');
        }

        if (memberError) {
          throw new Error('Failed to add member to organization');
        }

        router.push(`/${orgSlug}`);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'An unexpected error occurred',
        );
        setIsLoading(false);
      }
    }

    handleInvitation();
  }, [router, searchParams, supabase]);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  return null;
}

export default function AcceptOrgInvitation() {
  const { user } = useUser();
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AcceptOrgInvitationContent />
    </Suspense>
  );
}
