'use client';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@openpreview/ui/components/avatar';
import { Button } from '@openpreview/ui/components/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@openpreview/ui/components/table';
import { useToast } from '@openpreview/ui/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { acceptInvite } from './actions';
import { Tables } from '@openpreview/supabase';
import { Check } from 'lucide-react';
import { User } from '@supabase/supabase-js';

export interface PendingInvite {
  id: string;
  organizations: Tables<'organizations'>;
  role: string;
}

interface InviteListProps {
  user: User;
  pendingInvites: PendingInvite[];
}

export function InviteList({
  pendingInvites,
  user
}: InviteListProps) {
  const { toast } = useToast();
  const router = useRouter();

  const handleAcceptInvite = async (organizationId: string, organizationName: string, userId: string, userEmail: string) => {
    try {
      const result = await acceptInvite(organizationId, userId, userEmail);
      if (result.success) {
        toast({
          title: 'Organization accepted',
          description: `The organization ${organizationName} has been accepted.`,
        });
      } else {
        throw new Error(result.error || 'Failed to resend invitation');
      }
      router.refresh();
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to accept invitation. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (pendingInvites.length === 0) return null;

  return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Organization</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pendingInvites.map(invite => (
            <TableRow key={invite.id}>
              <TableCell className="flex items-center space-x-3">
              <Avatar>
                <AvatarImage
                  src={invite.organizations.logo_url}
                  alt={invite.organizations.name}
                />
                <AvatarFallback>
                  {invite.organizations.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span>{invite.organizations.name}</span>
              </TableCell>
              <TableCell>{invite.role}</TableCell>
              <TableCell>
              {/* Accept Invite Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    handleAcceptInvite(invite.organizations.id, invite.organizations.name, user.id, user.email)
                  }
                >
                    <Check className="mr-2 h-4 w-4" />
                    Accept
                    </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
  );
}
