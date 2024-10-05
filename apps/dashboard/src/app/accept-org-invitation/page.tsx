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

  useEffect(() => {
    async function handleInvitation() {
      try {
        const orgSlug = searchParams.get('org');
        const result = await acceptInvite({organizationSlug: orgSlug});
        if (result.success) {
          router.push(`/${orgSlug}`);
        }
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
} //Test
