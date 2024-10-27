alter table "public"."comments" drop column "x_position";

alter table "public"."comments" drop column "y_position";

alter table "public"."comments" add column "resolved_at" timestamp with time zone;

alter table "public"."comments" add column "selector" text not null;

alter table "public"."comments" add column "x_percent" double precision not null;

alter table "public"."comments" add column "y_percent" double precision not null;

alter table "public"."projects" alter column "organization_id" set not null;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_comments_with_replies(project_id uuid)
 RETURNS jsonb
 LANGUAGE sql
AS $function$WITH RECURSIVE comment_tree AS (
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
        jsonb_build_object(
            'id', u.id,
            'name', u.name,
            'avatar_url', u.avatar_url,
            'email', u.email
        ) AS user_info,
        JSONB '[]' AS replies
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.project_id = get_comments_with_replies.project_id AND c.parent_id IS NULL

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
        'replies', (
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
                    'resolved_at', r.resolved_at
                )
            )
            FROM comment_tree r
            WHERE r.parent_id = ct.id
        )
    )
)
FROM comment_tree ct
WHERE ct.parent_id IS NULL;$function$
;



