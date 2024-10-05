-- Add a 'status' column to the projects table
ALTER TABLE public.projects
ADD COLUMN status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted'));

-- Add an 'environment' column to the projects table
ALTER TABLE public.projects
ADD COLUMN environment text NOT NULL DEFAULT 'development' CHECK (environment IN ('development', 'staging', 'production'));

-- Add a 'type' column to the comments table
ALTER TABLE public.comments
ADD COLUMN type text NOT NULL DEFAULT 'general' CHECK (type IN ('general', 'bug', 'feature', 'improvement'));

-- Add a 'status' column to the comments table
ALTER TABLE public.comments
ADD COLUMN status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed'));

-- Add a 'priority' column to the comments table
ALTER TABLE public.comments
ADD COLUMN priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

-- Add a 'resolved_at' column to the comments table
ALTER TABLE public.comments
ADD COLUMN resolved_at timestamp with time zone;

-- Add a 'resolved_by' column to the comments table
ALTER TABLE public.comments
ADD COLUMN resolved_by uuid REFERENCES public.users(id);

-- Create a new table for comment reactions
CREATE TABLE public.comment_reactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reaction text NOT NULL CHECK (reaction IN ('like', 'dislike', 'laugh', 'heart')),
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(comment_id, user_id, reaction)
);

-- Add RLS policies for comment_reactions
ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comment_reactions_select_policy"
ON public.comment_reactions
FOR SELECT
TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.comments c
    JOIN public.projects p ON c.project_id = p.id
    WHERE c.id = comment_reactions.comment_id
    AND is_project_member(auth.uid(), p.id)
));

CREATE POLICY "comment_reactions_insert_policy"
ON public.comment_reactions
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
    SELECT 1 FROM public.comments c
    JOIN public.projects p ON c.project_id = p.id
    WHERE c.id = comment_reactions.comment_id
    AND is_project_member(auth.uid(), p.id)
));

CREATE POLICY "comment_reactions_delete_policy"
ON public.comment_reactions
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Add a function to get comment reactions count
CREATE OR REPLACE FUNCTION public.get_comment_reactions_count(_comment_id uuid)
RETURNS TABLE (reaction text, count bigint)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT reaction, COUNT(*) as count
    FROM public.comment_reactions
    WHERE comment_id = _comment_id
    GROUP BY reaction;
$$;

-- Add a last_activity column to the projects table
ALTER TABLE public.projects
ADD COLUMN last_activity timestamp with time zone;

-- Create a function to update the project's last_activity
CREATE OR REPLACE FUNCTION update_project_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.projects
    SET last_activity = NOW()
    WHERE id = NEW.project_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to update project's last_activity
CREATE TRIGGER update_project_activity_on_comment
AFTER INSERT OR UPDATE ON public.comments
FOR EACH ROW EXECUTE FUNCTION update_project_last_activity();

CREATE TRIGGER update_project_activity_on_reaction
AFTER INSERT ON public.comment_reactions
FOR EACH ROW EXECUTE FUNCTION update_project_last_activity();

-- Add a column for tracking comment edit history
ALTER TABLE public.comments
ADD COLUMN edit_history jsonb[];

-- Create a function to update comment edit history
CREATE OR REPLACE FUNCTION update_comment_edit_history()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.content <> NEW.content THEN
        NEW.edit_history = COALESCE(OLD.edit_history, ARRAY[]::jsonb[]) || 
            jsonb_build_object('edited_at', NOW(), 'previous_content', OLD.content);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to track comment edits
CREATE TRIGGER track_comment_edits
BEFORE UPDATE ON public.comments
FOR EACH ROW EXECUTE FUNCTION update_comment_edit_history();

-- Add a function to get project activity
CREATE OR REPLACE FUNCTION public.get_project_activity(_project_id uuid, _limit integer DEFAULT 50, _offset integer DEFAULT 0)
RETURNS TABLE (
    activity_type text,
    activity_data jsonb,
    created_at timestamp with time zone,
    user_id uuid
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 'comment' as activity_type,
           jsonb_build_object('id', id, 'content', content, 'type', type, 'status', status, 'priority', priority) as activity_data,
           created_at,
           user_id
    FROM public.comments
    WHERE project_id = _project_id
    UNION ALL
    SELECT 'reaction' as activity_type,
           jsonb_build_object('comment_id', cr.comment_id, 'reaction', cr.reaction) as activity_data,
           cr.created_at,
           cr.user_id
    FROM public.comment_reactions cr
    JOIN public.comments c ON cr.comment_id = c.id
    WHERE c.project_id = _project_id
    ORDER BY created_at DESC
    LIMIT _limit
    OFFSET _offset;
$$;

-- Update the get_project_stats function to include more statistics
CREATE OR REPLACE FUNCTION public.get_project_stats(_project_id uuid)
RETURNS TABLE (
    total_comments bigint,
    total_members bigint,
    total_reactions bigint,
    open_comments bigint,
    resolved_comments bigint,
    last_activity timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
SELECT 
    (SELECT COUNT(*) FROM public.comments WHERE project_id = _project_id) AS total_comments,
    (SELECT COUNT(*) FROM public.project_members WHERE project_id = _project_id) AS total_members,
    (SELECT COUNT(*) FROM public.comment_reactions cr JOIN public.comments c ON cr.comment_id = c.id WHERE c.project_id = _project_id) AS total_reactions,
    (SELECT COUNT(*) FROM public.comments WHERE project_id = _project_id AND status = 'open') AS open_comments,
    (SELECT COUNT(*) FROM public.comments WHERE project_id = _project_id AND status = 'resolved') AS resolved_comments,
    (SELECT last_activity FROM public.projects WHERE id = _project_id) AS last_activity;
$$;