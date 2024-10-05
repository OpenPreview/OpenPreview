'use client';

import { useSupabaseBrowser } from '@openpreview/db/client';
import { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { InviteList, PendingInvite } from './InvitesList';

interface PendingInvitesRealtimeProps {
  user: User;
  initialInvites: PendingInvite[];
}

export function PendingInvitesRealtime({
  user,
  initialInvites,
}: PendingInvitesRealtimeProps) {
  const [pendingInvites, setPendingInvites] =
    useState<PendingInvite[]>(initialInvites);
  const supabase = useSupabaseBrowser();

  useEffect(() => {
    const channel = supabase
      .channel('pending_invites')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'organization_invitations',
          filter: `recipient_email=eq.${user.email}`,
        },
        payload => {
          if (payload.eventType === 'INSERT') {
            setPendingInvites(prev => [...prev, payload.new as PendingInvite]);
          } else if (payload.eventType === 'DELETE') {
            setPendingInvites(prev =>
              prev.filter(invite => invite.id !== payload.old.id),
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, user.email]);

  return <InviteList user={user} pendingInvites={pendingInvites} />;
}
