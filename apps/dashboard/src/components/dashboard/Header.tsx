import { useUser } from '@openpreview/db/hooks/useUser/server';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@openpreview/ui/components/avatar';
import { Button } from '@openpreview/ui/components/button';
import { handleSignOut } from './actions';

export async function Header() {
  const { user } = await useUser();

  return (
    <header className="bg-background border-b">
      <div className="container flex h-14 items-center justify-end px-4 sm:px-6">
        <div className="flex items-center space-x-2 sm:space-x-4">
          <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
            <AvatarImage
              src={`${user?.avatar_url}`}
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
