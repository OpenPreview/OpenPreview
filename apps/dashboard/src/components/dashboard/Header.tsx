import { createClient } from '@lib/server';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@openpreview/ui/components/avatar';
import { Button } from '@openpreview/ui/components/button';
import { redirect } from 'next/navigation';

interface DatabaseUser {
  id: string;
  name: string;
  avatar_url: string;
}

export async function Header() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let dbUser: DatabaseUser | null = null;

  if (user) {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, avatar_url')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching user data:', error);
    } else {
      dbUser = data;
    }
  }

  async function handleSignOut() {
    'use server';
    const supabase = createClient();
    await supabase.auth.signOut();
    redirect('/');
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
          <form action={handleSignOut}>
            <Button
              variant="outline"
              type="submit"
              className="text-xs sm:text-sm"
            >
              Sign Out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
