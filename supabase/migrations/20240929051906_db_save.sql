drop policy "allowed_domain_insert_policy" on "public"."allowed_domains";

drop policy "allowed_domain_policy" on "public"."allowed_domains";

drop policy "comment_insert_policy" on "public"."comments";

drop policy "comment_view_policy" on "public"."comments";

drop policy "org_invitation_insert_policy" on "public"."organization_invitations";

drop policy "org_invitation_view_policy" on "public"."organization_invitations";

drop policy "org_member_view_policy" on "public"."organization_members";

create policy "udpate for member"
on "public"."organization_invitations"
as permissive
for update
to public
using ((is_member_of(auth.uid(), organization_id) OR (auth.email() = email)));


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


create policy "org_member_view_policy"
on "public"."organization_members"
as permissive
for select
to public
using (((user_id = auth.uid()) OR is_member_of(auth.uid(), organization_id)));



