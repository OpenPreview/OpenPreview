import { createClient } from '@lib/server';
import { Card, CardContent, CardHeader, CardTitle } from "@openpreview/ui/components/card";
import Link from 'next/link';
import { Button } from "@openpreview/ui/components/button";
import { Plus } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  slug: string;
}

export default async function DashboardPage() {
  const supabase = createClient();

  const { data: organizations, error } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .order('name');

  if (error) {
    console.error('Error fetching organizations:', error);
    return <div>Error loading organizations</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Your Organizations</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add Organization
        </Button>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {organizations.map((org: Organization) => (
          <Link href={`/${org.slug}`} key={org.id}>
            <Card className="hover:shadow-lg transition-shadow duration-200">
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
    </div>
  );
}
