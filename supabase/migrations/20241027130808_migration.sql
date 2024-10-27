drop function if exists "public"."get_comments_with_replies"(project_id uuid);

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_comments_with_replies(project_id uuid, url text)
 RETURNS jsonb
 LANGUAGE sql
AS $function$
WITH RECURSIVE comment_tree AS (
    -- Base case: Select top-level comments
    SELECT 
        c.id,
        c.content,
        c.created_at,
        c.updated_at,
        c.user_id,
        c.project_id,
        c.parent_id,
        c.url,
        c.x_percent,
        c.y_percent,
        c.selector,
        c.resolved_at,
        c.deployment_url,
        c.device_pixel_ratio,
        c.draft_mode,
        c.node_id,
        c.page_title,
        c.screen_height,
        c.screen_width,
        c.user_agent,
        jsonb_build_object(
            'id', u.id,
            'name', u.name,
            'avatar_url', u.avatar_url,
            'email', u.email
        ) AS user_info,
        JSONB '[]' AS replies
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.project_id = $1 
      AND c.url = $2 
      AND c.parent_id IS NULL 

    UNION ALL

    -- Recursive case: Select child comments
    SELECT 
        c.id,
        c.content,
        c.created_at,
        c.updated_at,
        c.user_id,
        c.project_id,
        c.parent_id,
        c.url,
        c.x_percent,
        c.y_percent,
        c.selector,
        c.resolved_at,
        c.deployment_url,
        c.device_pixel_ratio,
        c.draft_mode,
        c.node_id,
        c.page_title,
        c.screen_height,
        c.screen_width,
        c.user_agent,
        jsonb_build_object(
            'id', u.id,
            'name', u.name,
            'avatar_url', u.avatar_url,
            'email', u.email
        ) AS user_info,
        JSONB '[]' AS replies
    FROM comments c
    JOIN users u ON c.user_id = u.id
    JOIN comment_tree ct ON c.parent_id = ct.id
    WHERE c.project_id = $1
      AND c.url = $2  -- Enforces exact match within recursion as well
)
SELECT jsonb_agg(
    jsonb_build_object(
        'id', ct.id,
        'content', ct.content,
        'created_at', ct.created_at,
        'updated_at', ct.updated_at,
        'user', ct.user_info,
        'project_id', ct.project_id,
        'parent_id', ct.parent_id,
        'url', ct.url,
        'x_percent', ct.x_percent,
        'y_percent', ct.y_percent,
        'selector', ct.selector,
        'resolved_at', ct.resolved_at,
        'deployment_url', ct.deployment_url,
        'device_pixel_ratio', ct.device_pixel_ratio,
        'draft_mode', ct.draft_mode,
        'node_id', ct.node_id,
        'page_title', ct.page_title,
        'screen_height', ct.screen_height,
        'screen_width', ct.screen_width,
        'user_agent', ct.user_agent,
        'replies', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', r.id,
                    'content', r.content,
                    'created_at', r.created_at,
                    'updated_at', r.updated_at,
                    'user', r.user_info,
                    'project_id', r.project_id,
                    'parent_id', r.parent_id,
                    'url', r.url,
                    'x_percent', r.x_percent,
                    'y_percent', r.y_percent,
                    'selector', r.selector,
                    'resolved_at', r.resolved_at,
                    'deployment_url', r.deployment_url,
                    'device_pixel_ratio', r.device_pixel_ratio,
                    'draft_mode', r.draft_mode,
                    'node_id', r.node_id,
                    'page_title', r.page_title,
                    'screen_height', r.screen_height,
                    'screen_width', r.screen_width,
                    'user_agent', r.user_agent
                )
            )
            FROM comment_tree r
            WHERE r.parent_id = ct.id
        ), '[]'::jsonb)
    )
) AS comments
FROM comment_tree ct
WHERE ct.parent_id IS NULL;
$function$
;



