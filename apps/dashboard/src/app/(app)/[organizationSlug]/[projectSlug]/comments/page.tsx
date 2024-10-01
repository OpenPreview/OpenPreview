'use client';

import { useSupabaseBrowser } from '@openpreview/db/client';
import { Button } from '@openpreview/ui/components/button';
import { Separator } from '@openpreview/ui/components/separator';
import { Textarea } from '@openpreview/ui/components/textarea';
import { toast } from '@openpreview/ui/hooks/use-toast';
import { ArrowLeft, MessageSquare, Send } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface User {
  id: string;
  name: string;
  avatar_url: string;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user: User;
  parent_id: string | null;
  url: string;
  x_position: number;
  y_position: number;
}

interface CommentsPageProps {
  params: { organizationSlug: string; projectSlug: string };
}

export default function CommentsPage({ params }: CommentsPageProps) {
  const [project, setProject] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [comments, setComments] = useState<Comment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchParams = useSearchParams();
  const url = searchParams.get('url');

  const supabase = useSupabaseBrowser();

  const fetchComments = useCallback(
    async (projectId: string) => {
      const { data, error } = await supabase
        .from('comments')
        .select(
          `
        id,
        content,
        created_at,
        updated_at,
        parent_id,
        url,
        x_position,
        y_position,
        user:users (id, name, avatar_url)
      `,
        )
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching comments:', error);
        setError('Error loading comments');
        return;
      }

      setComments(data as Comment[]);
    },
    [supabase],
  );

  useEffect(() => {
    async function fetchProject() {
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, name')
        .eq('slug', params.projectSlug)
        .single();

      if (projectError) {
        setError('Project not found');
        return;
      }

      setProject(projectData);
      return projectData;
    }

    fetchProject().then(projectData => {
      if (projectData) {
        fetchComments(projectData.id);
      }
    });
  }, [params.projectSlug, supabase, fetchComments]);

  useEffect(() => {
    if (!project) return;

    const channel = supabase
      .channel(`comments:${project.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `project_id=eq.${project.id}`,
        },
        payload => {
          fetchComments(project.id);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [project, supabase, fetchComments]);

  const handleAddComment = async (parentId: string | null = null) => {
    if (!newComment.trim() || !project) return;
    setIsSubmitting(true);

    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData.user) {
        throw new Error('You must be logged in to comment');
      }

      const parentComment = parentId
        ? comments.find(c => c.id === parentId)
        : null;
      const x_position = parentComment ? parentComment.x_position : 0;
      const y_position = parentComment ? parentComment.y_position : 0;
      const commentUrl = parentComment ? parentComment.url : url;

      const { data: userProfile, error: userProfileError } = await supabase
        .from('users')
        .select('avatar_url')
        .eq('id', userData.user.id)
        .single();

      if (userProfileError) {
        throw new Error('Error fetching user profile');
      }

      const { data: newCommentData, error } = await supabase
        .from('comments')
        .insert({
          content: newComment,
          project_id: project.id,
          user_id: userData.user.id,
          parent_id: parentId,
          url: commentUrl || '',
          x_position,
          y_position,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      setNewComment('');
      setReplyingTo(null);
      toast({
        title: 'Comment added',
        description: 'Your comment has been successfully added.',
      });
    } catch (err) {
      console.error('Error adding comment:', err);
      toast({
        title: 'Error',
        description:
          err instanceof Error
            ? err.message
            : 'An error occurred while adding the comment',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error) {
    return <div className="text-center text-xl text-red-500">{error}</div>;
  }

  if (!project) {
    return <div className="text-center text-xl">Loading...</div>;
  }

  const renderCommentContent = (comment: Comment) => (
    <div className="flex items-start space-x-4 border-b border-gray-200 p-4">
      <Image
        src={comment.user.avatar_url || '/default-avatar.png'}
        alt={comment.user.name}
        width={48}
        height={48}
        className="rounded-full"
      />
      <div className="flex-grow">
        <div className="flex items-center">
          <span className="font-bold">{comment.user.name}</span>
          <span className="text-muted-foreground ml-2 text-sm">
            {new Date(comment.created_at).toLocaleString()}
          </span>
          {comment.updated_at !== comment.created_at && (
            <span className="text-muted-foreground ml-2 text-xs">(edited)</span>
          )}
        </div>
        <p className="mt-1 text-sm leading-relaxed">{comment.content}</p>
        {comment.url && (
          <p className="text-muted-foreground mt-1 text-xs">
            URL: {comment.url}
          </p>
        )}
        <div className="mt-2 flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setReplyingTo(comment.id)}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Reply
          </Button>
        </div>
        {replyingTo === comment.id && (
          <div className="mt-2">
            <Textarea
              placeholder="Write a reply..."
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              className="mb-2"
            />
            <Button
              onClick={() => handleAddComment(comment.id)}
              disabled={isSubmitting}
            >
              <Send className="mr-2 h-4 w-4" />
              {isSubmitting ? 'Sending...' : 'Reply'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  const renderComments = (parentId: string | null = null): JSX.Element[] => {
    return comments
      .filter(comment => comment.parent_id === parentId)
      .map(comment => (
        <div key={comment.id} className="border-b border-gray-200">
          {renderCommentContent(comment)}
          <div className="pl-12">{renderComments(comment.id)}</div>
        </div>
      ));
  };

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{project.name} Comments</h1>
          <p className="text-muted-foreground mt-2">
            View and manage project feedback
          </p>
        </div>
        <Link href={`/${params.organizationSlug}/${params.projectSlug}`}>
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Project
          </Button>
        </Link>
      </div>
      <Separator />
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <Textarea
          placeholder="What's happening?"
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          className="mb-2"
        />
        <Button onClick={() => handleAddComment(null)} disabled={isSubmitting}>
          <Send className="mr-2 h-4 w-4" />
          {isSubmitting ? 'Posting...' : 'Post'}
        </Button>
      </div>
      <div className="space-y-4 rounded-lg border border-gray-200 bg-white">
        {comments.length === 0 ? (
          <p className="text-muted-foreground p-4 text-center">
            No comments yet.
          </p>
        ) : (
          renderComments()
        )}
      </div>
    </div>
  );
}
