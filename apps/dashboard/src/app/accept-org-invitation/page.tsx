'use client';

import { useSupabaseBrowser } from '@openpreview/db/client';
import { useUser } from '@openpreview/db/hooks/useUser/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { acceptInvite } from 'src/components/dashboard/actions';

function AcceptOrgInvitationContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = useSupabaseBrowser();
  const searchParams = useSearchParams();
  const { user, isLoading: isUserLoading } = useUser();

  useEffect(() => {
    async function handleInvitation() {
      if (isUserLoading) return;

      try {
        const orgSlug = searchParams.get('org');
        if (!orgSlug) throw new Error('Organization slug is missing');

        if (!user) {
          // If user is not logged in, redirect to login page
          router.push(`/login?next=/accept-org-invitation?org=${orgSlug}`);
          return;
        }

        const result = await acceptInvite({organizationSlug: orgSlug});
        if (result.success) {
          router.push(`/${orgSlug}`);
        } else {
          throw new Error(result.error || 'Failed to accept invitation');
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'An unexpected error occurred',
        );
      } finally {
        setIsLoading(false);
      }
    }

    handleInvitation();
  }, [router, searchParams, supabase, user, isUserLoading]);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  return null;
}

export default function AcceptOrgInvitation() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AcceptOrgInvitationContent />
    </Suspense>
  );
}
