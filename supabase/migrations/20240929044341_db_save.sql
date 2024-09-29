alter table "public"."users" alter column "id" drop default;

alter table "public"."users" add constraint "users_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."users" validate constraint "users_id_fkey";

create policy "delete for invite"
on "public"."organization_invitations"
as permissive
for delete
to public
using ((invited_by = auth.uid()));
