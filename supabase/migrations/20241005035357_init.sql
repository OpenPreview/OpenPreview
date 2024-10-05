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

create table "public"."organizations" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "slug" text default generate_random_slug(),
    "logo_url" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "logo_updated_at" timestamp with time zone
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
    "updated_at" timestamp with time zone default now(),
    "avatar_updated_at" timestamp with time zone
);


alter table "public"."users" enable row level security;

CREATE UNIQUE INDEX allowed_domains_pkey ON public.allowed_domains USING btree (id);

CREATE UNIQUE INDEX allowed_domains_project_id_domain_key ON public.allowed_domains USING btree (project_id, domain);

CREATE UNIQUE INDEX comments_pkey ON public.comments USING btree (id);

CREATE UNIQUE INDEX organization_invitations_pkey ON public.organization_invitations USING btree (id);

CREATE UNIQUE INDEX organization_members_pkey ON public.organization_members USING btree (id);

CREATE UNIQUE INDEX organizations_pkey ON public.organizations USING btree (id);

CREATE UNIQUE INDEX organizations_slug_key ON public.organizations USING btree (slug);

CREATE UNIQUE INDEX project_members_pkey ON public.project_members USING btree (id);

CREATE UNIQUE INDEX projects_pkey ON public.projects USING btree (id);

CREATE UNIQUE INDEX projects_slug_key ON public.projects USING btree (slug);

CREATE UNIQUE INDEX unique_org_invite_email ON public.organization_invitations USING btree (organization_id, email);

CREATE UNIQUE INDEX unique_org_member ON public.organization_members USING btree (organization_id, user_id);

CREATE UNIQUE INDEX unique_org_member_email ON public.organization_members USING btree (organization_id, user_id);

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

alter table "public"."allowed_domains" add constraint "allowed_domains_project_id_domain_key" UNIQUE using index "allowed_domains_project_id_domain_key";

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

alter table "public"."organization_invitations" add constraint "unique_org_invite_email" UNIQUE using index "unique_org_invite_email";

alter table "public"."organization_members" add constraint "organization_members_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."organization_members" validate constraint "organization_members_organization_id_fkey";

alter table "public"."organization_members" add constraint "organization_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."organization_members" validate constraint "organization_members_user_id_fkey";

alter table "public"."organization_members" add constraint "unique_org_member" UNIQUE using index "unique_org_member";

alter table "public"."organization_members" add constraint "unique_org_member_email" UNIQUE using index "unique_org_member_email";

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

CREATE OR REPLACE FUNCTION public.handle_new_organization()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (NEW.id, auth.uid(), 'owner');
  RETURN NEW;
END;
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

CREATE OR REPLACE FUNCTION public.has_organization_role(_user_id uuid, _organization_id uuid, _roles text[])
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members
    WHERE organization_id = _organization_id
    AND user_id = _user_id
    AND role = ANY(_roles)
  );
$function$
;

CREATE OR REPLACE FUNCTION public.has_project_role(_user_id uuid, _project_id uuid, _roles text[])
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members
    JOIN projects ON projects.organization_id = organization_members.organization_id
    WHERE projects.id = _project_id
    AND organization_members.user_id = _user_id
    AND organization_members.role = ANY(_roles)
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_member_of(_user_id uuid, _organization_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members
    WHERE organization_id = _organization_id
    AND user_id = _user_id
  );
$function$
;

CREATE OR REPLACE FUNCTION public.update_avatar_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF OLD.avatar_url IS DISTINCT FROM NEW.avatar_url THEN
        NEW.avatar_updated_at = NOW() + INTERVAL '1 minute';
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_logo_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF OLD.logo_url IS DISTINCT FROM NEW.logo_url THEN
        NEW.logo_updated_at = NOW() + INTERVAL '1 minute';
    END IF;
    RETURN NEW;
END;
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

create policy "allowed_domains_delete_policy"
on "public"."allowed_domains"
as permissive
for delete
to authenticated
using (has_project_role(auth.uid(), project_id, ARRAY['admin'::text, 'owner'::text]));


create policy "allowed_domains_insert_policy"
on "public"."allowed_domains"
as permissive
for insert
to authenticated
with check (has_project_role(auth.uid(), project_id, ARRAY['admin'::text, 'owner'::text]));


create policy "allowed_domains_select_policy"
on "public"."allowed_domains"
as permissive
for select
to authenticated
using (has_project_role(auth.uid(), project_id, ARRAY['member'::text, 'admin'::text, 'owner'::text]));


create policy "allowed_domains_update_policy"
on "public"."allowed_domains"
as permissive
for update
to authenticated
using (has_project_role(auth.uid(), project_id, ARRAY['admin'::text, 'owner'::text]));


create policy "comment_delete_policy"
on "public"."comments"
as permissive
for delete
to authenticated
using (((user_id = auth.uid()) OR has_project_role(auth.uid(), project_id, ARRAY['admin'::text, 'owner'::text])));


create policy "comment_insert_policy"
on "public"."comments"
as permissive
for insert
to authenticated
with check (has_project_role(auth.uid(), project_id, ARRAY['editor'::text, 'admin'::text, 'owner'::text]));


create policy "comment_select_policy"
on "public"."comments"
as permissive
for select
to authenticated
using (has_project_role(auth.uid(), project_id, ARRAY['member'::text, 'admin'::text, 'editor'::text, 'owner'::text]));


create policy "comment_update_policy"
on "public"."comments"
as permissive
for update
to authenticated
using (((user_id = auth.uid()) OR has_project_role(auth.uid(), project_id, ARRAY['admin'::text, 'owner'::text])));


create policy "org_invitation_delete_policy"
on "public"."organization_invitations"
as permissive
for delete
to authenticated
using (has_organization_role(auth.uid(), organization_id, ARRAY['admin'::text, 'owner'::text]));


create policy "org_invitation_insert_policy"
on "public"."organization_invitations"
as permissive
for insert
to authenticated
with check (has_organization_role(auth.uid(), organization_id, ARRAY['admin'::text, 'owner'::text]));


create policy "org_invitation_select_policy"
on "public"."organization_invitations"
as permissive
for select
to authenticated
using (has_organization_role(auth.uid(), organization_id, ARRAY['admin'::text, 'owner'::text]));


create policy "org_invitation_update_policy"
on "public"."organization_invitations"
as permissive
for update
to authenticated
using (has_organization_role(auth.uid(), organization_id, ARRAY['admin'::text, 'owner'::text]));


create policy "org_member_delete_policy"
on "public"."organization_members"
as permissive
for delete
to authenticated
using (has_organization_role(auth.uid(), organization_id, ARRAY['owner'::text]));


create policy "org_member_insert_policy"
on "public"."organization_members"
as permissive
for insert
to authenticated
with check (has_organization_role(auth.uid(), organization_id, ARRAY['admin'::text, 'owner'::text]));


create policy "org_member_select_policy"
on "public"."organization_members"
as permissive
for select
to authenticated
using (((user_id = auth.uid()) OR is_member_of(auth.uid(), organization_id)));


create policy "org_member_update_policy"
on "public"."organization_members"
as permissive
for update
to authenticated
using (((auth.uid() = user_id) OR has_organization_role(auth.uid(), organization_id, ARRAY['admin'::text, 'owner'::text])));


create policy "organization_delete_policy"
on "public"."organizations"
as permissive
for delete
to authenticated
using (has_organization_role(auth.uid(), id, ARRAY['owner'::text]));


create policy "organization_insert_policy"
on "public"."organizations"
as permissive
for insert
to authenticated
with check (true);


create policy "organization_select_policy"
on "public"."organizations"
as permissive
for select
to authenticated
using (is_member_of(auth.uid(), id));


create policy "organization_update_policy"
on "public"."organizations"
as permissive
for update
to authenticated
using (has_organization_role(auth.uid(), id, ARRAY['admin'::text, 'owner'::text]));


create policy "project_member_delete_policy"
on "public"."project_members"
as permissive
for delete
to authenticated
using (has_project_role(auth.uid(), project_id, ARRAY['admin'::text, 'owner'::text]));


create policy "project_member_insert_policy"
on "public"."project_members"
as permissive
for insert
to authenticated
with check (has_project_role(auth.uid(), project_id, ARRAY['admin'::text, 'owner'::text]));


create policy "project_member_select_policy"
on "public"."project_members"
as permissive
for select
to authenticated
using (((user_id = auth.uid()) OR has_project_role(auth.uid(), project_id, ARRAY['member'::text, 'admin'::text, 'owner'::text])));


create policy "project_member_update_policy"
on "public"."project_members"
as permissive
for update
to authenticated
using (has_project_role(auth.uid(), project_id, ARRAY['admin'::text, 'owner'::text]));


create policy "project_delete_policy"
on "public"."projects"
as permissive
for delete
to authenticated
using (has_organization_role(auth.uid(), organization_id, ARRAY['admin'::text, 'owner'::text]));


create policy "project_insert_policy"
on "public"."projects"
as permissive
for insert
to authenticated
with check (has_organization_role(auth.uid(), organization_id, ARRAY['admin'::text, 'owner'::text]));


create policy "project_select_policy"
on "public"."projects"
as permissive
for select
to authenticated
using (is_member_of(auth.uid(), organization_id));


create policy "project_update_policy"
on "public"."projects"
as permissive
for update
to authenticated
using (has_organization_role(auth.uid(), organization_id, ARRAY['admin'::text, 'owner'::text]));


create policy "user_delete_policy"
on "public"."users"
as permissive
for delete
to public
using (false);


create policy "user_insert_policy"
on "public"."users"
as permissive
for insert
to public
with check (false);


create policy "user_select_policy"
on "public"."users"
as permissive
for select
to authenticated
using (((auth.uid() = id) OR (EXISTS ( SELECT 1
   FROM organization_members om1
  WHERE ((om1.user_id = auth.uid()) AND (EXISTS ( SELECT 1
           FROM organization_members om2
          WHERE ((om2.organization_id = om1.organization_id) AND (om2.user_id = users.id)))))))));


create policy "user_update_policy"
on "public"."users"
as permissive
for update
to authenticated
using ((auth.uid() = id));


CREATE TRIGGER on_organization_created AFTER INSERT ON public.organizations FOR EACH ROW EXECUTE FUNCTION handle_new_organization();

CREATE TRIGGER update_logo_updated_at_trigger BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION update_logo_updated_at();

CREATE TRIGGER update_avatar_updated_at_trigger BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_avatar_updated_at();

-- Create public buckets
INSERT INTO storage.buckets (id, name, public)
SELECT 'organization_logos', 'organization_logos', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'organization_logos'
);

INSERT INTO storage.buckets (id, name, public)
SELECT 'user_avatars', 'user_avatars', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'user_avatars'
);

-- Storage policies for organization logos
CREATE POLICY "Anyone can update organization logos."
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'organization_logos')
WITH CHECK (bucket_id = 'organization_logos');

CREATE POLICY "Anyone can upload organization logos."
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'organization_logos');

CREATE POLICY "Organization logos are publicly accessible."
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'organization_logos');

-- Storage policies for user avatars
CREATE POLICY "Anyone can upload avatars."
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'user_avatars');

CREATE POLICY "User avatars are publicly accessible."
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'user_avatars');

CREATE POLICY "Users can update their own avatar."
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'user_avatars' AND auth.uid() = owner)
WITH CHECK (bucket_id = 'user_avatars');
