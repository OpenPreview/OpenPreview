import { fetchPendingInvites } from '@/components/dashboard/actions';
import { PendingInvitesRealtime } from '@/components/dashboard/PendingInvitesRealtime';
import { createClient } from '@openpreview/db/server';
import { Button } from '@openpreview/ui/components/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@openpreview/ui/components/card';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

interface Organization {
  id: string;
  name: string;
  slug: string;
}

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: organizations, error } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .order('name');

  if (error) {
    console.error('Error fetching organizations:', error);
    return <div>Error loading organizations</div>;
  }

  const { pendingInvites, error: inviteError } = await fetchPendingInvites();

  if (inviteError) {
    console.error('Error fetching pending invites:', inviteError);
    return <div>Error loading pending invites</div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Your Organizations</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add Organization
        </Button>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {organizations.map((org: Organization) => (
          <Link href={`/${org.slug}`} key={org.id}>
            <Card className="transition-shadow duration-200 hover:shadow-lg">
              <CardHeader>
                <CardTitle>{org.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Slug: {org.slug}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <PendingInvitesRealtime user={user} initialInvites={pendingInvites} />
    </div>
  );
}
