CREATE UNIQUE INDEX unique_org_member ON public.organization_members USING btree (organization_id, user_id);

CREATE UNIQUE INDEX unique_org_member_email ON public.organization_members USING btree (organization_id, user_id);

alter table "public"."organization_members" add constraint "unique_org_member" UNIQUE using index "unique_org_member";

alter table "public"."organization_members" add constraint "unique_org_member_email" UNIQUE using index "unique_org_member_email";


