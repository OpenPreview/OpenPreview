create table "public"."allowed_domains" (
    "id" uuid not null default gen_random_uuid(),
    "project_id" uuid,
    "domain" text not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."allowed_domains" enable row level security;

create table "public"."comments" (
    "id" uuid not null default gen_random_uuid(),
    "project_id" uuid,
    "user_id" uuid,
    "parent_id" uuid,
    "content" text not null,
    "x_position" double precision not null,
    "y_position" double precision not null,
    "url" text not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."comments" enable row level security;

create table "public"."organization_invitations" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid,
    "email" text not null,
    "role" text not null,
    "invited_by" uuid,
    "accepted_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone default now()
);


alter table "public"."organization_invitations" enable row level security;

create table "public"."organization_members" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid,
    "user_id" uuid,
    "role" text not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."organization_members" enable row level security;

create table "public"."organizations" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "slug" text default generate_random_slug(),
    "logo_url" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."organizations" enable row level security;

create table "public"."project_members" (
    "id" uuid not null default gen_random_uuid(),
    "project_id" uuid,
    "user_id" uuid,
    "role" text not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."project_members" enable row level security;

create table "public"."projects" (
    "id" uuid not null default gen_random_uuid(),
    "slug" text default generate_random_slug(),
    "organization_id" uuid,
    "name" text not null,
    "description" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."projects" enable row level security;

create table "public"."users" (
    "id" uuid not null,
    "email" text not null,
    "name" text,
    "avatar_url" text,
    "onboarding_completed" boolean default false,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."users" enable row level security;

CREATE UNIQUE INDEX allowed_domains_pkey ON public.allowed_domains USING btree (id);

CREATE UNIQUE INDEX comments_pkey ON public.comments USING btree (id);

CREATE UNIQUE INDEX organization_invitations_pkey ON public.organization_invitations USING btree (id);

CREATE UNIQUE INDEX organization_members_pkey ON public.organization_members USING btree (id);

CREATE UNIQUE INDEX organizations_pkey ON public.organizations USING btree (id);

CREATE UNIQUE INDEX organizations_slug_key ON public.organizations USING btree (slug);

CREATE UNIQUE INDEX project_members_pkey ON public.project_members USING btree (id);

CREATE UNIQUE INDEX projects_pkey ON public.projects USING btree (id);

CREATE UNIQUE INDEX projects_slug_key ON public.projects USING btree (slug);

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

alter table "public"."allowed_domains" add constraint "allowed_domains_pkey" PRIMARY KEY using index "allowed_domains_pkey";

alter table "public"."comments" add constraint "comments_pkey" PRIMARY KEY using index "comments_pkey";

alter table "public"."organization_invitations" add constraint "organization_invitations_pkey" PRIMARY KEY using index "organization_invitations_pkey";

alter table "public"."organization_members" add constraint "organization_members_pkey" PRIMARY KEY using index "organization_members_pkey";

alter table "public"."organizations" add constraint "organizations_pkey" PRIMARY KEY using index "organizations_pkey";

alter table "public"."project_members" add constraint "project_members_pkey" PRIMARY KEY using index "project_members_pkey";

alter table "public"."projects" add constraint "projects_pkey" PRIMARY KEY using index "projects_pkey";

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."allowed_domains" add constraint "allowed_domains_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE not valid;

alter table "public"."allowed_domains" validate constraint "allowed_domains_project_id_fkey";

alter table "public"."comments" add constraint "comments_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE not valid;

alter table "public"."comments" validate constraint "comments_parent_id_fkey";

alter table "public"."comments" add constraint "comments_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE not valid;

alter table "public"."comments" validate constraint "comments_project_id_fkey";

alter table "public"."comments" add constraint "comments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."comments" validate constraint "comments_user_id_fkey";

alter table "public"."organization_invitations" add constraint "organization_invitations_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."organization_invitations" validate constraint "organization_invitations_invited_by_fkey";

alter table "public"."organization_invitations" add constraint "organization_invitations_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."organization_invitations" validate constraint "organization_invitations_organization_id_fkey";

alter table "public"."organization_members" add constraint "organization_members_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."organization_members" validate constraint "organization_members_organization_id_fkey";

alter table "public"."organization_members" add constraint "organization_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."organization_members" validate constraint "organization_members_user_id_fkey";

alter table "public"."organizations" add constraint "organizations_slug_key" UNIQUE using index "organizations_slug_key";

alter table "public"."project_members" add constraint "project_members_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE not valid;

alter table "public"."project_members" validate constraint "project_members_project_id_fkey";

alter table "public"."project_members" add constraint "project_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."project_members" validate constraint "project_members_user_id_fkey";

alter table "public"."projects" add constraint "projects_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."projects" validate constraint "projects_organization_id_fkey";

alter table "public"."projects" add constraint "projects_slug_key" UNIQUE using index "projects_slug_key";

alter table "public"."users" add constraint "users_email_key" UNIQUE using index "users_email_key";

alter table "public"."users" add constraint "users_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."users" validate constraint "users_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.generate_random_slug()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..10 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_comments_with_replies(project_id uuid)
 RETURNS jsonb
 LANGUAGE sql
AS $function$
WITH RECURSIVE comment_tree AS (
    -- Base case: Select top-level comments
    SELECT 
        c.id,
        c.content,
        c.created_at,
        c.user_id,
        c.project_id,
        c.parent_id,
        jsonb_build_object(
            'id', u.id,
            'name', u.name,
            'avatar_url', u.avatar_url
        ) AS user_info,
        JSONB '[]' AS replies
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.project_id = get_comments_with_replies.project_id

    UNION ALL

    -- Recursive case: Select child comments
    SELECT 
        c.id,
        c.content,
        c.created_at,
        c.user_id,
        c.project_id,
        c.parent_id,
        jsonb_build_object(
            'id', u.id,
            'name', u.name,
            'avatar_url', u.avatar_url
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
        'user', ct.user_info,
        'replies', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', r.id,
                    'content', r.content,
                    'created_at', r.created_at,
                    'user', r.user_info
                )
            )
            FROM comment_tree r
            WHERE r.parent_id = ct.id
        )
    )
)
FROM comment_tree ct
WHERE ct.parent_id IS NULL;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_member_of(_user_id uuid, _organization_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
SELECT EXISTS (
  SELECT 1
  FROM organization_members om
  WHERE om.organization_id = _organization_id
  AND om.user_id = _user_id
);
$function$
;

grant delete on table "public"."allowed_domains" to "anon";

grant insert on table "public"."allowed_domains" to "anon";

grant references on table "public"."allowed_domains" to "anon";

grant select on table "public"."allowed_domains" to "anon";

grant trigger on table "public"."allowed_domains" to "anon";

grant truncate on table "public"."allowed_domains" to "anon";

grant update on table "public"."allowed_domains" to "anon";

grant delete on table "public"."allowed_domains" to "authenticated";

grant insert on table "public"."allowed_domains" to "authenticated";

grant references on table "public"."allowed_domains" to "authenticated";

grant select on table "public"."allowed_domains" to "authenticated";

grant trigger on table "public"."allowed_domains" to "authenticated";

grant truncate on table "public"."allowed_domains" to "authenticated";

grant update on table "public"."allowed_domains" to "authenticated";

grant delete on table "public"."allowed_domains" to "service_role";

grant insert on table "public"."allowed_domains" to "service_role";

grant references on table "public"."allowed_domains" to "service_role";

grant select on table "public"."allowed_domains" to "service_role";

grant trigger on table "public"."allowed_domains" to "service_role";

grant truncate on table "public"."allowed_domains" to "service_role";

grant update on table "public"."allowed_domains" to "service_role";

grant delete on table "public"."comments" to "anon";

grant insert on table "public"."comments" to "anon";

grant references on table "public"."comments" to "anon";

grant select on table "public"."comments" to "anon";

grant trigger on table "public"."comments" to "anon";

grant truncate on table "public"."comments" to "anon";

grant update on table "public"."comments" to "anon";

grant delete on table "public"."comments" to "authenticated";

grant insert on table "public"."comments" to "authenticated";

grant references on table "public"."comments" to "authenticated";

grant select on table "public"."comments" to "authenticated";

grant trigger on table "public"."comments" to "authenticated";

grant truncate on table "public"."comments" to "authenticated";

grant update on table "public"."comments" to "authenticated";

grant delete on table "public"."comments" to "service_role";

grant insert on table "public"."comments" to "service_role";

grant references on table "public"."comments" to "service_role";

grant select on table "public"."comments" to "service_role";

grant trigger on table "public"."comments" to "service_role";

grant truncate on table "public"."comments" to "service_role";

grant update on table "public"."comments" to "service_role";

grant delete on table "public"."organization_invitations" to "anon";

grant insert on table "public"."organization_invitations" to "anon";

grant references on table "public"."organization_invitations" to "anon";

grant select on table "public"."organization_invitations" to "anon";

grant trigger on table "public"."organization_invitations" to "anon";

grant truncate on table "public"."organization_invitations" to "anon";

grant update on table "public"."organization_invitations" to "anon";

grant delete on table "public"."organization_invitations" to "authenticated";

grant insert on table "public"."organization_invitations" to "authenticated";

grant references on table "public"."organization_invitations" to "authenticated";

grant select on table "public"."organization_invitations" to "authenticated";

grant trigger on table "public"."organization_invitations" to "authenticated";

grant truncate on table "public"."organization_invitations" to "authenticated";

grant update on table "public"."organization_invitations" to "authenticated";

grant delete on table "public"."organization_invitations" to "service_role";

grant insert on table "public"."organization_invitations" to "service_role";

grant references on table "public"."organization_invitations" to "service_role";

grant select on table "public"."organization_invitations" to "service_role";

grant trigger on table "public"."organization_invitations" to "service_role";

grant truncate on table "public"."organization_invitations" to "service_role";

grant update on table "public"."organization_invitations" to "service_role";

grant delete on table "public"."organization_members" to "anon";

grant insert on table "public"."organization_members" to "anon";

grant references on table "public"."organization_members" to "anon";

grant select on table "public"."organization_members" to "anon";

grant trigger on table "public"."organization_members" to "anon";

grant truncate on table "public"."organization_members" to "anon";

grant update on table "public"."organization_members" to "anon";

grant delete on table "public"."organization_members" to "authenticated";

grant insert on table "public"."organization_members" to "authenticated";

grant references on table "public"."organization_members" to "authenticated";

grant select on table "public"."organization_members" to "authenticated";

grant trigger on table "public"."organization_members" to "authenticated";

grant truncate on table "public"."organization_members" to "authenticated";

grant update on table "public"."organization_members" to "authenticated";

grant delete on table "public"."organization_members" to "service_role";

grant insert on table "public"."organization_members" to "service_role";

grant references on table "public"."organization_members" to "service_role";

grant select on table "public"."organization_members" to "service_role";

grant trigger on table "public"."organization_members" to "service_role";

grant truncate on table "public"."organization_members" to "service_role";

grant update on table "public"."organization_members" to "service_role";

grant delete on table "public"."organizations" to "anon";

grant insert on table "public"."organizations" to "anon";

grant references on table "public"."organizations" to "anon";

grant select on table "public"."organizations" to "anon";

grant trigger on table "public"."organizations" to "anon";

grant truncate on table "public"."organizations" to "anon";

grant update on table "public"."organizations" to "anon";

grant delete on table "public"."organizations" to "authenticated";

grant insert on table "public"."organizations" to "authenticated";

grant references on table "public"."organizations" to "authenticated";

grant select on table "public"."organizations" to "authenticated";

grant trigger on table "public"."organizations" to "authenticated";

grant truncate on table "public"."organizations" to "authenticated";

grant update on table "public"."organizations" to "authenticated";

grant delete on table "public"."organizations" to "service_role";

grant insert on table "public"."organizations" to "service_role";

grant references on table "public"."organizations" to "service_role";

grant select on table "public"."organizations" to "service_role";

grant trigger on table "public"."organizations" to "service_role";

grant truncate on table "public"."organizations" to "service_role";

grant update on table "public"."organizations" to "service_role";

grant delete on table "public"."project_members" to "anon";

grant insert on table "public"."project_members" to "anon";

grant references on table "public"."project_members" to "anon";

grant select on table "public"."project_members" to "anon";

grant trigger on table "public"."project_members" to "anon";

grant truncate on table "public"."project_members" to "anon";

grant update on table "public"."project_members" to "anon";

grant delete on table "public"."project_members" to "authenticated";

grant insert on table "public"."project_members" to "authenticated";

grant references on table "public"."project_members" to "authenticated";

grant select on table "public"."project_members" to "authenticated";

grant trigger on table "public"."project_members" to "authenticated";

grant truncate on table "public"."project_members" to "authenticated";

grant update on table "public"."project_members" to "authenticated";

grant delete on table "public"."project_members" to "service_role";

grant insert on table "public"."project_members" to "service_role";

grant references on table "public"."project_members" to "service_role";

grant select on table "public"."project_members" to "service_role";

grant trigger on table "public"."project_members" to "service_role";

grant truncate on table "public"."project_members" to "service_role";

grant update on table "public"."project_members" to "service_role";

grant delete on table "public"."projects" to "anon";

grant insert on table "public"."projects" to "anon";

grant references on table "public"."projects" to "anon";

grant select on table "public"."projects" to "anon";

grant trigger on table "public"."projects" to "anon";

grant truncate on table "public"."projects" to "anon";

grant update on table "public"."projects" to "anon";

grant delete on table "public"."projects" to "authenticated";

grant insert on table "public"."projects" to "authenticated";

grant references on table "public"."projects" to "authenticated";

grant select on table "public"."projects" to "authenticated";

grant trigger on table "public"."projects" to "authenticated";

grant truncate on table "public"."projects" to "authenticated";

grant update on table "public"."projects" to "authenticated";

grant delete on table "public"."projects" to "service_role";

grant insert on table "public"."projects" to "service_role";

grant references on table "public"."projects" to "service_role";

grant select on table "public"."projects" to "service_role";

grant trigger on table "public"."projects" to "service_role";

grant truncate on table "public"."projects" to "service_role";

grant update on table "public"."projects" to "service_role";

grant delete on table "public"."users" to "anon";

grant insert on table "public"."users" to "anon";

grant references on table "public"."users" to "anon";

grant select on table "public"."users" to "anon";

grant trigger on table "public"."users" to "anon";

grant truncate on table "public"."users" to "anon";

grant update on table "public"."users" to "anon";

grant delete on table "public"."users" to "authenticated";

grant insert on table "public"."users" to "authenticated";

grant references on table "public"."users" to "authenticated";

grant select on table "public"."users" to "authenticated";

grant trigger on table "public"."users" to "authenticated";

grant truncate on table "public"."users" to "authenticated";

grant update on table "public"."users" to "authenticated";

grant delete on table "public"."users" to "service_role";

grant insert on table "public"."users" to "service_role";

grant references on table "public"."users" to "service_role";

grant select on table "public"."users" to "service_role";

grant trigger on table "public"."users" to "service_role";

grant truncate on table "public"."users" to "service_role";

grant update on table "public"."users" to "service_role";

create policy "allowed_domain_insert_policy"
on "public"."allowed_domains"
as permissive
for insert
to authenticated
with check ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = allowed_domains.project_id) AND is_member_of(auth.uid(), p.organization_id)))));


create policy "allowed_domain_policy"
on "public"."allowed_domains"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = allowed_domains.project_id) AND is_member_of(auth.uid(), p.organization_id)))));


create policy "comment_insert_policy"
on "public"."comments"
as permissive
for insert
to authenticated
with check ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = comments.project_id) AND is_member_of(auth.uid(), p.organization_id)))));


create policy "comment_view_policy"
on "public"."comments"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = comments.project_id) AND is_member_of(auth.uid(), p.organization_id)))));


create policy "delete for invite"
on "public"."organization_invitations"
as permissive
for delete
to public
using ((invited_by = auth.uid()));


create policy "org_invitation_insert_policy"
on "public"."organization_invitations"
as permissive
for insert
to authenticated
with check ((is_member_of(auth.uid(), organization_id) OR (auth.email() = email)));


create policy "org_invitation_view_policy"
on "public"."organization_invitations"
as permissive
for select
to public
using ((is_member_of(auth.uid(), organization_id) OR (auth.email() = email)));


create policy "udpate for member"
on "public"."organization_invitations"
as permissive
for update
to public
using ((is_member_of(auth.uid(), organization_id) OR (auth.email() = email)));


create policy "org_member_insert_policy"
on "public"."organization_members"
as permissive
for insert
to authenticated
with check (true);


create policy "org_member_view_policy"
on "public"."organization_members"
as permissive
for select
to public
using (((user_id = auth.uid()) OR is_member_of(auth.uid(), organization_id)));


create policy "org_insert_policy"
on "public"."organizations"
as permissive
for insert
to authenticated
with check (true);


create policy "org_logo_update_policy"
on "public"."organizations"
as permissive
for update
to authenticated
using (true)
with check ((((logo_url IS NOT NULL) AND (logo_url <> ''::text)) OR (logo_url IS NULL)));


create policy "org_member_policy"
on "public"."organizations"
as permissive
for all
to public
using (is_member_of(auth.uid(), id));


create policy "org_select_policy"
on "public"."organizations"
as permissive
for select
to authenticated
using (true);


create policy "project_member_insert_policy"
on "public"."project_members"
as permissive
for insert
to authenticated
with check ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_members.project_id) AND is_member_of(auth.uid(), p.organization_id)))));


create policy "project_member_view_policy"
on "public"."project_members"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_members.project_id) AND is_member_of(auth.uid(), p.organization_id)))));


create policy "project_insert_policy"
on "public"."projects"
as permissive
for insert
to authenticated
with check (is_member_of(auth.uid(), organization_id));


create policy "project_member_policy"
on "public"."projects"
as permissive
for select
to public
using (is_member_of(auth.uid(), organization_id));


create policy "user_avatar_update_policy"
on "public"."users"
as permissive
for update
to authenticated
using ((id = auth.uid()))
with check ((((avatar_url IS NOT NULL) AND (avatar_url <> ''::text)) OR (avatar_url IS NULL)));


create policy "user_org_member_policy"
on "public"."users"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.user_id = auth.uid()) AND (om.organization_id IN ( SELECT organization_members.organization_id
           FROM organization_members
          WHERE (organization_members.user_id = users.id)))))));


create policy "user_self_policy"
on "public"."users"
as permissive
for all
to public
using ((id = auth.uid()));



