'use client';

import { useSupabaseBrowser } from '@lib/client';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@openpreview/ui/components/avatar';
import { Button } from '@openpreview/ui/components/button';
import { Skeleton } from '@openpreview/ui/components/skeleton';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface DatabaseUser {
  id: string;
  name: string;
  avatar_url: string;
}

export function Header() {
  const [dbUser, setDbUser] = useState<DatabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = useSupabaseBrowser();
  const router = useRouter();

  useEffect(() => {
    async function fetchUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('users')
          .select('id, name, avatar_url')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user data:', error);
        } else {
          setDbUser(data);
        }
      }
      setIsLoading(false);
    }

    fetchUser();
  }, [supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    router.refresh();
  }

  if (isLoading) {
    return (
      <header className="bg-background border-b">
        <div className="container flex h-14 items-center justify-end px-4 sm:px-6">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Skeleton className="h-8 w-8 rounded-full sm:h-10 sm:w-10" />
            <Skeleton className="h-8 w-20 sm:h-10 sm:w-24" />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-background border-b">
      <div className="container flex h-14 items-center justify-end px-4 sm:px-6">
        <div className="flex items-center space-x-2 sm:space-x-4">
          <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
            <AvatarImage
              src={dbUser?.avatar_url || undefined}
              alt={dbUser?.name || 'User avatar'}
            />
            <AvatarFallback>
              {dbUser?.name ? dbUser.name.charAt(0).toUpperCase() : 'U'}
            </AvatarFallback>
          </Avatar>
          <Button
            variant="outline"
            onClick={signOut}
            className="text-xs sm:text-sm"
          >
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
}
