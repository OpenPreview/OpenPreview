-- Function to generate a random slug
CREATE OR REPLACE FUNCTION generate_random_slug() RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql;


-- ORGANIZATIONS
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE DEFAULT generate_random_slug(),
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- USERS
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ORGANIZATION_MEMBERS
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- PROJECTS
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE DEFAULT generate_random_slug(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- PROJECT_MEMBERS
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ALLOWED_DOMAINS
CREATE TABLE allowed_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- COMMENTS
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  x_position FLOAT NOT NULL,
  y_position FLOAT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ORGANIZATION_INVITATIONS
CREATE TABLE organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  invited_by UUID REFERENCES users(id) ON DELETE CASCADE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Function to check if a user is a member of an organization
CREATE OR REPLACE FUNCTION is_member_of(_user_id uuid, _organization_id uuid) RETURNS bool AS $$
SELECT EXISTS (
  SELECT 1
  FROM organization_members om
  WHERE om.organization_id = _organization_id
  AND om.user_id = _user_id
);
$$ LANGUAGE sql SECURITY DEFINER;


-- Enable RLS for all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE allowed_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

-- Define RLS policies
-- Organizations: Allow insert for authenticated users, view for members
CREATE POLICY org_insert_policy ON organizations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY org_select_policy ON organizations FOR SELECT TO authenticated USING (true);
CREATE POLICY org_member_policy ON organizations FOR ALL
    USING (is_member_of(auth.uid(), id));

-- Users: Only the user themselves can view
CREATE POLICY user_self_policy ON users
    USING (users.id = auth.uid());

-- Organization Members: Allow insert, and view for organization members
CREATE POLICY org_member_insert_policy ON organization_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY org_member_view_policy ON organization_members FOR SELECT
    USING (user_id = auth.uid());

-- Projects: Only members can view and insert
CREATE POLICY project_member_policy ON projects FOR SELECT
    USING (is_member_of(auth.uid(), organization_id));
CREATE POLICY project_insert_policy ON projects FOR INSERT TO authenticated
    WITH CHECK (is_member_of(auth.uid(), organization_id));

-- Project Members: Only organization members can view and insert
CREATE POLICY project_member_view_policy ON project_members FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = project_members.project_id
        AND is_member_of(auth.uid(), p.organization_id)
    ));
    
CREATE POLICY project_member_insert_policy ON project_members FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = project_members.project_id
        AND is_member_of(auth.uid(), p.organization_id)
    ));

-- Allowed Domains: Only project members can view and insert
CREATE POLICY allowed_domain_policy ON allowed_domains FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM project_members
        WHERE project_members.project_id = allowed_domains.project_id
        AND project_members.user_id = auth.uid()
    ));
CREATE POLICY allowed_domain_insert_policy ON allowed_domains FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM project_members
        WHERE project_members.project_id = allowed_domains.project_id
        AND project_members.user_id = auth.uid()
    ));

-- Comments: Only project members can view and insert
CREATE POLICY comment_view_policy ON comments FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM project_members
        WHERE project_members.project_id = comments.project_id
        AND project_members.user_id = auth.uid()
    ));
CREATE POLICY comment_insert_policy ON comments FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM project_members
        WHERE project_members.project_id = comments.project_id
        AND project_members.user_id = auth.uid()
    ));

-- Organization Invitations: Only organization members can view and insert
CREATE POLICY org_invitation_view_policy ON organization_invitations FOR SELECT
    USING (is_member_of(auth.uid(), organization_id));
CREATE POLICY org_invitation_insert_policy ON organization_invitations FOR INSERT TO authenticated
    WITH CHECK (is_member_of(auth.uid(), organization_id));

-- Create a function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to call the function when a new user is added to auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Set up Storage!
INSERT INTO storage.buckets (id, name, public) VALUES ('organization_logos', 'organization_logos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('user_avatars', 'user_avatars', true);

-- Set up access controls for organization logos
CREATE POLICY "Organization logos are publicly accessible." ON storage.objects
  FOR SELECT USING (bucket_id = 'organization_logos');

CREATE POLICY "Anyone can upload organization logos." ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'organization_logos');

CREATE POLICY "Anyone can update organization logos." ON storage.objects
  FOR UPDATE USING (bucket_id = 'organization_logos')
  WITH CHECK (bucket_id = 'organization_logos');

-- Set up access controls for user avatars
CREATE POLICY "User avatars are publicly accessible." ON storage.objects
  FOR SELECT USING (bucket_id = 'user_avatars');

CREATE POLICY "Anyone can upload avatars." ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'user_avatars');

CREATE POLICY "Users can update their own avatar." ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'user_avatars' AND
    auth.uid() = owner
  ) WITH CHECK (bucket_id = 'user_avatars');

-- Add policies to the organizations and users tables
CREATE POLICY org_logo_update_policy ON organizations
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (
        (logo_url IS NOT NULL AND logo_url <> '') OR logo_url IS NULL
    );

CREATE POLICY user_avatar_update_policy ON users
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (
        (avatar_url IS NOT NULL AND avatar_url <> '') OR avatar_url IS NULL
    );
-- Function to fetch all comments and child comments in a JSON object
CREATE OR REPLACE FUNCTION get_comments_with_replies(project_id UUID)
RETURNS JSONB AS $$
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
$$ LANGUAGE SQL;
