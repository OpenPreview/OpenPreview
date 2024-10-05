'use client';

import { useUser } from '@openpreview/db/hooks/useUser/client';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@openpreview/ui/components/avatar';
import { Button } from '@openpreview/ui/components/button';
import { Skeleton } from '@openpreview/ui/components/skeleton';
import { handleSignOut } from './actions';

export function Header() {
  const { user, isLoading } = useUser();

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
              src={`${user?.avatar_url}?t=${user?.avatar_updated_at}`}
              alt={user?.name || 'User avatar'}
            />
            <AvatarFallback>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
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
