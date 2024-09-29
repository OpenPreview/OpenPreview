'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@openpreview/ui/components/avatar';
import { Button } from '@openpreview/ui/components/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@openpreview/ui/components/form';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@openpreview/ui/components/table';
import { Edit2, UserMinus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { updateMemberRole } from './actions';

interface Member {
  id: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar_url: string;
  };
}

interface MembersListProps {
  members: Member[];
  currentUserId: string;
}

const formSchema = z.object({
  role: z.string(), // Remove the enum restriction
});

export function MembersList({ members, currentUserId }: MembersListProps) {
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  console.log(members);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role:
        (editingMember?.role as z.infer<typeof formSchema>['role']) || 'viewer',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!editingMember) return;

    const formData = new FormData();
    formData.append('memberId', editingMember.id);
    formData.append('role', values.role);

    const result = await updateMemberRole(formData);
    if (result.success) {
      setEditingMember(null);
      // You might want to refresh the members list here
    } else {
      // Handle error, maybe show an error message
      console.error('Failed to update member role');
    }
  };

  const isCurrentUserOwner = useMemo(() => {
    return members.some(
      member => member.user.id === currentUserId && member.role === 'owner',
    );
  }, [members, currentUserId]);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Member</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map(member => (
          <TableRow key={member.id}>
            <TableCell className="flex items-center space-x-3">
              <Avatar>
                <AvatarImage
                  src={member.user.avatar_url}
                  alt={member.user.name}
                />
                <AvatarFallback>
                  {member.user.name ? member.user.name.charAt(0) : 'U'}
                </AvatarFallback>
              </Avatar>
              <span>{member.user.name}</span>
            </TableCell>
            <TableCell>{member.user.email}</TableCell>
            <TableCell>
              {editingMember?.id === member.id ? (
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-8"
                  >
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <input
                              {...field}
                              type="text"
                              className="w-[120px] rounded border px-2 py-1"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              ) : (
                member.role
              )}
            </TableCell>
            <TableCell>
              <div className="flex space-x-2">
                {editingMember?.id === member.id ? (
                  <div className="flex items-center space-x-2">
                    <Button onClick={form.handleSubmit(onSubmit)} size="sm">
                      Save
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingMember(null);
                        form.reset();
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingMember(member);
                        form.reset({
                          role: member.role as z.infer<
                            typeof formSchema
                          >['role'],
                        });
                      }}
                      disabled={!isCurrentUserOwner || member.role === 'owner'}
                    >
                      <Edit2 className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!isCurrentUserOwner || member.role === 'owner'}
                    >
                      <UserMinus className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  </>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
