import { createClient } from '@lib/server';
import { Button } from '@openpreview/ui/components/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@openpreview/ui/components/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user: {
    name: string;
    avatar_url: string;
  };
}

export default async function CommentsPage({
  params,
}: {
  params: { organizationSlug: string; projectSlug: string };
}) {
  const supabase = createClient();

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('slug', params.projectSlug)
    .single();

  if (!project) {
    return <div>Project not found</div>;
  }

  const { data: comments, error } = await supabase
    .from('comments')
    .select(
      `
      id,
      content,
      created_at,
      user:users (name, avatar_url)
    `,
    )
    .eq('project_id', project.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching comments:', error);
    return <div>Error loading comments</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Project Comments</h1>
        <Link href={`/${params.organizationSlug}/${params.projectSlug}`}>
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Project
          </Button>
        </Link>
      </div>
      <div className="space-y-4">
        {comments.map((comment: Comment) => (
          <Card key={comment.id}>
            <CardHeader>
              <div className="flex items-center space-x-4">
                <img
                  src={comment.user.avatar_url || '/default-avatar.png'}
                  alt={comment.user.name}
                  className="h-10 w-10 rounded-full"
                />
                <div>
                  <CardTitle>{comment.user.name}</CardTitle>
                  <p className="text-sm text-gray-500">
                    {new Date(comment.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p>{comment.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
