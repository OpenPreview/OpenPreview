-- Organizations table policies
DROP POLICY IF EXISTS "org_select_policy" ON public.organizations;
DROP POLICY IF EXISTS "org_insert_policy" ON public.organizations;
DROP POLICY IF EXISTS "org_update_policy" ON public.organizations;
DROP POLICY IF EXISTS "org_delete_policy" ON public.organizations;

CREATE OR REPLACE FUNCTION public.get_user_org_role(_user_id uuid, _organization_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
SELECT role
FROM organization_members
WHERE organization_id = _organization_id AND user_id = _user_id;
$$;

CREATE POLICY "org_select_policy"
ON public.organizations
FOR SELECT
TO authenticated
USING (is_member_of(auth.uid(), id));

CREATE POLICY "org_insert_policy"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "org_update_policy"
ON public.organizations
FOR UPDATE
TO authenticated
USING (is_org_admin_or_owner(auth.uid(), id))
WITH CHECK (is_org_admin_or_owner(auth.uid(), id));

CREATE POLICY "org_delete_policy"
ON public.organizations
FOR DELETE
TO authenticated
USING (is_org_admin_or_owner(auth.uid(), id) AND get_user_org_role(auth.uid(), id) = 'owner');

-- Projects table policies
DROP POLICY IF EXISTS "project_select_policy" ON public.projects;
DROP POLICY IF EXISTS "project_insert_policy" ON public.projects;
DROP POLICY IF EXISTS "project_update_policy" ON public.projects;
DROP POLICY IF EXISTS "project_delete_policy" ON public.projects;

CREATE POLICY "project_select_policy"
ON public.projects
FOR SELECT
TO authenticated
USING (is_member_of(auth.uid(), organization_id));

CREATE POLICY "project_insert_policy"
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (is_org_admin_or_owner(auth.uid(), organization_id));

CREATE POLICY "project_update_policy"
ON public.projects
FOR UPDATE
TO authenticated
USING (is_project_member(auth.uid(), id) AND get_user_project_role(auth.uid(), id) IN ('owner', 'admin', 'editor'))
WITH CHECK (is_project_member(auth.uid(), id) AND get_user_project_role(auth.uid(), id) IN ('owner', 'admin', 'editor'));

CREATE POLICY "project_delete_policy"
ON public.projects
FOR DELETE
TO authenticated
USING (is_org_admin_or_owner(auth.uid(), organization_id) AND get_user_project_role(auth.uid(), id) = 'owner');

-- Comments table policies
DROP POLICY IF EXISTS "comment_select_policy" ON public.comments;
DROP POLICY IF EXISTS "comment_insert_policy" ON public.comments;
DROP POLICY IF EXISTS "comment_update_policy" ON public.comments;
DROP POLICY IF EXISTS "comment_delete_policy" ON public.comments;

CREATE POLICY "comment_select_policy"
ON public.comments
FOR SELECT
TO authenticated
USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "comment_insert_policy"
ON public.comments
FOR INSERT
TO authenticated
WITH CHECK (is_project_member(auth.uid(), project_id));

CREATE POLICY "comment_update_policy"
ON public.comments
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR is_org_admin_or_owner(auth.uid(), (SELECT organization_id FROM projects WHERE id = project_id)))
WITH CHECK (user_id = auth.uid() OR is_org_admin_or_owner(auth.uid(), (SELECT organization_id FROM projects WHERE id = project_id)));

CREATE POLICY "comment_delete_policy"
ON public.comments
FOR DELETE
TO authenticated
USING (user_id = auth.uid() OR is_org_admin_or_owner(auth.uid(), (SELECT organization_id FROM projects WHERE id = project_id)));

-- Organization Members table policies
DROP POLICY IF EXISTS "org_member_select_policy" ON public.organization_members;
DROP POLICY IF EXISTS "org_member_insert_policy" ON public.organization_members;
DROP POLICY IF EXISTS "org_member_update_policy" ON public.organization_members;
DROP POLICY IF EXISTS "org_member_delete_policy" ON public.organization_members;

CREATE POLICY "org_member_select_policy"
ON public.organization_members
FOR SELECT
TO authenticated
USING (is_member_of(auth.uid(), organization_id));

CREATE POLICY "org_member_insert_policy"
ON public.organization_members
FOR INSERT
TO authenticated
WITH CHECK (is_org_admin_or_owner(auth.uid(), organization_id));

CREATE POLICY "org_member_update_policy"
ON public.organization_members
FOR UPDATE
TO authenticated
USING (is_org_admin_or_owner(auth.uid(), organization_id))
WITH CHECK (is_org_admin_or_owner(auth.uid(), organization_id));

CREATE POLICY "org_member_delete_policy"
ON public.organization_members
FOR DELETE
TO authenticated
USING (is_org_admin_or_owner(auth.uid(), organization_id));

-- Project Members table policies
DROP POLICY IF EXISTS "project_member_select_policy" ON public.project_members;
DROP POLICY IF EXISTS "project_member_insert_policy" ON public.project_members;
DROP POLICY IF EXISTS "project_member_update_policy" ON public.project_members;
DROP POLICY IF EXISTS "project_member_delete_policy" ON public.project_members;

CREATE POLICY "project_member_select_policy"
ON public.project_members
FOR SELECT
TO authenticated
USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "project_member_insert_policy"
ON public.project_members
FOR INSERT
TO authenticated
WITH CHECK (is_org_admin_or_owner(auth.uid(), (SELECT organization_id FROM projects WHERE id = project_id)));

CREATE POLICY "project_member_update_policy"
ON public.project_members
FOR UPDATE
TO authenticated
USING (is_org_admin_or_owner(auth.uid(), (SELECT organization_id FROM projects WHERE id = project_id)))
WITH CHECK (is_org_admin_or_owner(auth.uid(), (SELECT organization_id FROM projects WHERE id = project_id)));

CREATE POLICY "project_member_delete_policy"
ON public.project_members
FOR DELETE
TO authenticated
USING (is_org_admin_or_owner(auth.uid(), (SELECT organization_id FROM projects WHERE id = project_id)));

-- Allowed Domains table policies
DROP POLICY IF EXISTS "allowed_domain_select_policy" ON public.allowed_domains;
DROP POLICY IF EXISTS "allowed_domain_insert_policy" ON public.allowed_domains;
DROP POLICY IF EXISTS "allowed_domain_update_policy" ON public.allowed_domains;
DROP POLICY IF EXISTS "allowed_domain_delete_policy" ON public.allowed_domains;

CREATE POLICY "allowed_domain_select_policy"
ON public.allowed_domains
FOR SELECT
TO authenticated
USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "allowed_domain_insert_policy"
ON public.allowed_domains
FOR INSERT
TO authenticated
WITH CHECK (is_org_admin_or_owner(auth.uid(), (SELECT organization_id FROM projects WHERE id = project_id)));

CREATE POLICY "allowed_domain_update_policy"
ON public.allowed_domains
FOR UPDATE
TO authenticated
USING (is_org_admin_or_owner(auth.uid(), (SELECT organization_id FROM projects WHERE id = project_id)))
WITH CHECK (is_org_admin_or_owner(auth.uid(), (SELECT organization_id FROM projects WHERE id = project_id)));

CREATE POLICY "allowed_domain_delete_policy"
ON public.allowed_domains
FOR DELETE
TO authenticated
USING (is_org_admin_or_owner(auth.uid(), (SELECT organization_id FROM projects WHERE id = project_id)));

-- Users table policies
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_policy" ON public.users;
DROP POLICY IF EXISTS "users_delete_policy" ON public.users;
DROP POLICY IF EXISTS "user_self_policy" ON public.users;

CREATE POLICY "users_select_policy"
ON public.users
FOR SELECT
TO authenticated
USING ((EXISTS ( SELECT 1
   FROM organization_members om
  WHERE ((om.user_id = auth.uid()) AND (om.organization_id IN ( SELECT organization_members.organization_id
           FROM organization_members
          WHERE (organization_members.user_id = users.id)))))));


CREATE POLICY "user_self_policy"
ON public.users
AS PERMISSIVE
FOR ALL
TO public
USING ((id = auth.uid()));

CREATE POLICY "users_insert_policy"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_policy"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "users_delete_policy"
ON public.users
FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- Organization Invitations table policies
DROP POLICY IF EXISTS "org_invitation_select_policy" ON public.organization_invitations;
DROP POLICY IF EXISTS "org_invitation_insert_policy" ON public.organization_invitations;
DROP POLICY IF EXISTS "org_invitation_update_policy" ON public.organization_invitations;
DROP POLICY IF EXISTS "org_invitation_delete_policy" ON public.organization_invitations;

CREATE POLICY "org_invitation_select_policy"
ON public.organization_invitations
FOR SELECT
TO authenticated
USING (is_org_admin_or_owner(auth.uid(), organization_id) OR email = auth.email());

CREATE POLICY "org_invitation_insert_policy"
ON public.organization_invitations
FOR INSERT
TO authenticated
WITH CHECK (is_org_admin_or_owner(auth.uid(), organization_id));

CREATE POLICY "org_invitation_update_policy"
ON public.organization_invitations
FOR UPDATE
TO authenticated
USING (is_org_admin_or_owner(auth.uid(), organization_id) OR email = auth.email())
WITH CHECK (is_org_admin_or_owner(auth.uid(), organization_id) OR email = auth.email());

CREATE POLICY "org_invitation_delete_policy"
ON public.organization_invitations
FOR DELETE
TO authenticated
USING (is_org_admin_or_owner(auth.uid(), organization_id));

-- Add avatar_updated_at column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_updated_at TIMESTAMP WITH TIME ZONE;

-- Create a function to update avatar_updated_at
CREATE OR REPLACE FUNCTION update_avatar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.avatar_url IS DISTINCT FROM NEW.avatar_url THEN
        NEW.avatar_updated_at = NOW() + INTERVAL '1 minute';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to call the function
CREATE TRIGGER update_avatar_updated_at_trigger
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION update_avatar_updated_at();

-- Add logo_updated_at column to organizations table
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS logo_updated_at TIMESTAMP WITH TIME ZONE;

-- Create a function to update logo_updated_at
CREATE OR REPLACE FUNCTION update_logo_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.logo_url IS DISTINCT FROM NEW.logo_url THEN
        NEW.logo_updated_at = NOW() + INTERVAL '1 minute';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to call the function
CREATE TRIGGER update_logo_updated_at_trigger
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION update_logo_updated_at();
