'use client';

import { useSupabaseBrowser } from '@openpreview/db/client';
import { Tables } from '@openpreview/supabase';
import { useEffect, useState } from 'react';

export function useUser() {
  const [user, setUser] = useState<Tables<'users'> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = useSupabaseBrowser();

  useEffect(() => {
    async function fetchUser() {
      setIsLoading(true);
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!authUser) {
          setUser(null);
          return;
        }

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (userError) throw userError;

        setUser(userData as Tables<'users'>);
      } catch (error) {
        console.error('Error fetching user:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUser();
  }, [supabase]);

  return { user, isLoading };
}

