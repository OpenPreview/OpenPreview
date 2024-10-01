-- Ensure uniqueness for organization members
ALTER TABLE public.organization_members
ADD CONSTRAINT unique_org_member UNIQUE (organization_id, user_id);

-- Ensure uniqueness for project members
ALTER TABLE public.project_members
ADD CONSTRAINT unique_project_member UNIQUE (project_id, user_id);

-- Ensure uniqueness for allowed domains within a project
ALTER TABLE public.allowed_domains
ADD CONSTRAINT unique_allowed_domain UNIQUE (project_id, domain);

-- Ensure uniqueness for organization invitations
ALTER TABLE public.organization_invitations
ADD CONSTRAINT unique_org_invitation UNIQUE (organization_id, email);

-- Add indexes to improve query performance
CREATE INDEX idx_comments_project_id ON public.comments (project_id);
CREATE INDEX idx_comments_user_id ON public.comments (user_id);
CREATE INDEX idx_projects_organization_id ON public.projects (organization_id);

-- Add a check constraint to ensure valid roles
ALTER TABLE public.organization_members
ADD CONSTRAINT check_org_member_role CHECK (role IN ('owner', 'viewer', 'editor', 'admin'));

ALTER TABLE public.project_members
ADD CONSTRAINT check_project_member_role CHECK (role IN ('owner', 'viewer', 'editor', 'admin'));

-- Add a trigger to automatically update the 'updated_at' column
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organization_modtime
BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_project_modtime
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_user_modtime
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Add cascade delete for project members when a project is deleted
ALTER TABLE public.project_members
DROP CONSTRAINT IF EXISTS project_members_project_id_fkey,
ADD CONSTRAINT project_members_project_id_fkey
FOREIGN KEY (project_id)
REFERENCES public.projects(id)
ON DELETE CASCADE;

-- Add cascade delete for allowed domains when a project is deleted
ALTER TABLE public.allowed_domains
DROP CONSTRAINT IF EXISTS allowed_domains_project_id_fkey,
ADD CONSTRAINT allowed_domains_project_id_fkey
FOREIGN KEY (project_id)
REFERENCES public.projects(id)
ON DELETE CASCADE;

-- Add a function to check if a user is an admin or owner of an organization
CREATE OR REPLACE FUNCTION public.is_org_admin_or_owner(_user_id uuid, _organization_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
SELECT EXISTS (
  SELECT 1
  FROM organization_members om
  WHERE om.organization_id = _organization_id
  AND om.user_id = _user_id
  AND om.role IN ('owner', 'admin')
);
$$;

-- Update RLS policies to use the new is_org_admin_or_owner function
DROP POLICY IF EXISTS "org_admin_owner_policy" ON public.organizations;

CREATE POLICY "org_admin_owner_policy"
ON public.organizations
FOR UPDATE
TO authenticated
USING (is_org_admin_or_owner(auth.uid(), id))
WITH CHECK (is_org_admin_or_owner(auth.uid(), id));

-- Add a policy to allow org admins and owners to delete projects
DROP POLICY IF EXISTS "project_delete_policy" ON public.projects;

CREATE POLICY "project_delete_policy"
ON public.projects
FOR DELETE
TO authenticated
USING (is_org_admin_or_owner(auth.uid(), organization_id));

-- Add a policy to allow org admins and owners to remove allowed domains
DROP POLICY IF EXISTS "allowed_domains_delete_policy" ON public.allowed_domains;

CREATE POLICY "allowed_domains_delete_policy"
ON public.allowed_domains
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM projects p
    WHERE p.id = project_id
    AND is_org_admin_or_owner(auth.uid(), p.organization_id)
  )
);

-- Update existing data to ensure roles are correct
UPDATE public.organization_members
SET role = 'viewer'
WHERE role NOT IN ('owner', 'viewer', 'editor', 'admin');

UPDATE public.project_members
SET role = 'viewer'
WHERE role NOT IN ('owner', 'viewer', 'editor', 'admin');

-- Update organization_invitations table to use the correct roles
DO $$
DECLARE
    updated_count INT;
BEGIN
    -- Update existing data
    WITH updated AS (
        UPDATE public.organization_invitations
        SET role = CASE 
            WHEN LOWER(role) = 'owner' THEN 'owner'
            WHEN LOWER(role) = 'viewer' THEN 'viewer'
            WHEN LOWER(role) = 'editor' THEN 'editor'
            WHEN LOWER(role) = 'admin' THEN 'admin'
            ELSE role -- Keep the original role if it doesn't match any of the above
        END
        WHERE role NOT IN ('owner', 'viewer', 'editor', 'admin')
        RETURNING *
    )
    SELECT COUNT(*) INTO updated_count FROM updated;

    RAISE NOTICE 'Updated % rows in organization_invitations', updated_count;

    -- Add the constraint
    ALTER TABLE public.organization_invitations
    ADD CONSTRAINT check_org_invitation_role CHECK (role IN ('owner', 'viewer', 'editor', 'admin'));

    RAISE NOTICE 'Successfully added check constraint to organization_invitations';
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error occurred: %', SQLERRM;
        RAISE NOTICE 'Unable to complete the operation. Please check the data in the organization_invitations table manually.';
END $$;

-- Ensure there's only one owner per organization
CREATE OR REPLACE FUNCTION check_single_owner()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role = 'owner' THEN
        IF EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = NEW.organization_id
            AND role = 'owner'
            AND id != NEW.id
        ) THEN
            RAISE EXCEPTION 'Only one owner per organization is allowed';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_owner
BEFORE INSERT OR UPDATE ON public.organization_members
FOR EACH ROW EXECUTE FUNCTION check_single_owner();

-- Function to get the current owner of an organization
CREATE OR REPLACE FUNCTION get_org_owner(org_id uuid)
RETURNS uuid AS $$
    SELECT user_id
    FROM public.organization_members
    WHERE organization_id = org_id AND role = 'owner'
    LIMIT 1;
$$ LANGUAGE sql;

-- Function to transfer ownership
CREATE OR REPLACE FUNCTION transfer_org_ownership(org_id uuid, new_owner_id uuid, current_user_id uuid)
RETURNS void AS $$
DECLARE
    current_owner_id uuid;
BEGIN
    -- Get the current owner
    SELECT get_org_owner(org_id) INTO current_owner_id;
    
    -- Check if the current user is the owner
    IF current_owner_id != current_user_id THEN
        RAISE EXCEPTION 'Only the current owner can transfer ownership';
    END IF;

    -- Update the roles
    UPDATE public.organization_members
    SET role = 'admin'
    WHERE organization_id = org_id AND user_id = current_owner_id;

    UPDATE public.organization_members
    SET role = 'owner'
    WHERE organization_id = org_id AND user_id = new_owner_id;

    -- If the new owner wasn't a member, this will raise an exception
    IF NOT FOUND THEN
        RAISE EXCEPTION 'New owner must be an existing member of the organization';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Update existing data to ensure only one owner per organization
DO $$
DECLARE
    org record;
    first_owner uuid;
BEGIN
    FOR org IN SELECT DISTINCT organization_id FROM public.organization_members LOOP
        SELECT user_id INTO first_owner
        FROM public.organization_members
        WHERE organization_id = org.organization_id AND role = 'owner'
        LIMIT 1;

        IF first_owner IS NOT NULL THEN
            -- Set all other owners to admin
            UPDATE public.organization_members
            SET role = 'admin'
            WHERE organization_id = org.organization_id
            AND role = 'owner'
            AND user_id != first_owner;
        ELSE
            -- If no owner, set the first admin as owner
            UPDATE public.organization_members
            SET role = 'owner'
            WHERE id = (
                SELECT id
                FROM public.organization_members
                WHERE organization_id = org.organization_id
                AND role = 'admin'
                LIMIT 1
            );
        END IF;
    END LOOP;
END $$;

-- Add a function to check if a user is a member of a project
CREATE OR REPLACE FUNCTION public.is_project_member(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
SELECT EXISTS (
  SELECT 1
  FROM project_members pm
  WHERE pm.project_id = _project_id
  AND pm.user_id = _user_id
);
$$;

-- Add RLS policies for projects
CREATE POLICY "project_member_select_policy"
ON public.projects
FOR SELECT
TO authenticated
USING (is_project_member(auth.uid(), id));

CREATE POLICY "project_member_update_policy"
ON public.projects
FOR UPDATE
TO authenticated
USING (is_project_member(auth.uid(), id) AND EXISTS (
  SELECT 1 FROM project_members
  WHERE project_id = id AND user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
));

-- Add RLS policies for comments
CREATE POLICY "comment_project_member_policy"
ON public.comments
FOR ALL
TO authenticated
USING (is_project_member(auth.uid(), project_id));

-- Add a function to get user's role in a project
CREATE OR REPLACE FUNCTION public.get_user_project_role(_user_id uuid, _project_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
SELECT role
FROM project_members
WHERE project_id = _project_id AND user_id = _user_id;
$$;

-- Add a trigger to ensure project owner is also an organization member
CREATE OR REPLACE FUNCTION ensure_project_owner_is_org_member()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = NEW.organization_id AND user_id = NEW.user_id
    ) THEN
        RAISE EXCEPTION 'Project owner must be a member of the organization';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_owner_org_member_check
BEFORE INSERT OR UPDATE ON public.project_members
FOR EACH ROW
WHEN (NEW.role = 'owner')
EXECUTE FUNCTION ensure_project_owner_is_org_member();

-- Add a function to check if a domain is allowed for a project
CREATE OR REPLACE FUNCTION public.is_domain_allowed(_project_id uuid, _domain text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
SELECT EXISTS (
  SELECT 1
  FROM allowed_domains
  WHERE project_id = _project_id AND domain = _domain
);
$$;

-- Add an index to improve performance of domain checks
CREATE INDEX idx_allowed_domains_project_domain ON public.allowed_domains (project_id, domain);

-- Add a trigger to prevent circular parent-child relationships in comments
CREATE OR REPLACE FUNCTION prevent_circular_comment_references()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.parent_id IS NOT NULL THEN
        IF NEW.id = NEW.parent_id OR EXISTS (
            WITH RECURSIVE comment_chain(id, parent_id) AS (
                SELECT id, parent_id FROM public.comments WHERE id = NEW.parent_id
                UNION ALL
                SELECT c.id, c.parent_id FROM public.comments c
                INNER JOIN comment_chain cc ON c.id = cc.parent_id
            )
            SELECT 1 FROM comment_chain WHERE id = NEW.id
        ) THEN
            RAISE EXCEPTION 'Circular comment reference detected';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_circular_comments
BEFORE INSERT OR UPDATE ON public.comments
FOR EACH ROW EXECUTE FUNCTION prevent_circular_comment_references();

-- Add a function to get all descendants of a comment
CREATE OR REPLACE FUNCTION public.get_comment_descendants(_comment_id uuid)
RETURNS TABLE (id uuid, content text, user_id uuid, created_at timestamptz, depth int)
LANGUAGE sql
SECURITY DEFINER
AS $$
WITH RECURSIVE comment_tree AS (
    SELECT id, content, user_id, created_at, 0 AS depth
    FROM public.comments
    WHERE id = _comment_id
    UNION ALL
    SELECT c.id, c.content, c.user_id, c.created_at, ct.depth + 1
    FROM public.comments c 
    JOIN comment_tree ct ON c.parent_id = ct.id
)
SELECT id, content, user_id, created_at, depth
FROM comment_tree
WHERE id != _comment_id
ORDER BY depth, created_at;
$$;

-- Add a policy to prevent users from updating or deleting other users' comments
CREATE POLICY "users_manage_own_comments"
ON public.comments
FOR ALL
TO authenticated
USING (
    CASE 
        WHEN (SELECT is_org_admin_or_owner(auth.uid(), (SELECT organization_id FROM projects WHERE id = project_id))) THEN true
        ELSE user_id = auth.uid()
    END
)
WITH CHECK (
    CASE 
        WHEN (SELECT is_org_admin_or_owner(auth.uid(), (SELECT organization_id FROM projects WHERE id = project_id))) THEN true
        ELSE user_id = auth.uid()
    END
);

-- Add a function to get project statistics
CREATE OR REPLACE FUNCTION public.get_project_stats(_project_id uuid)
RETURNS TABLE (total_comments bigint, total_members bigint, last_activity timestamptz)
LANGUAGE sql
SECURITY DEFINER
AS $$
SELECT 
    (SELECT COUNT(*) FROM public.comments WHERE project_id = _project_id) AS total_comments,
    (SELECT COUNT(*) FROM public.project_members WHERE project_id = _project_id) AS total_members,
    (SELECT MAX(created_at) FROM (
        SELECT created_at FROM public.comments WHERE project_id = _project_id
        UNION ALL
        SELECT created_at FROM public.project_members WHERE project_id = _project_id
    ) AS activities) AS last_activity;
$$;

-- Ensure cascading deletes for organization members
ALTER TABLE public.project_members
DROP CONSTRAINT IF EXISTS project_members_user_id_fkey,
ADD CONSTRAINT project_members_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.users(id)
ON DELETE CASCADE;

-- Add a check constraint to ensure project slugs are lowercase and contain only allowed characters
ALTER TABLE public.projects
ADD CONSTRAINT check_project_slug CHECK (slug ~ '^[a-z0-9-]+$');

-- Add a check constraint to ensure organization slugs are lowercase and contain only allowed characters
ALTER TABLE public.organizations
ADD CONSTRAINT check_organization_slug CHECK (slug ~ '^[a-z0-9-]+$');