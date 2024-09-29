DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

create policy "Anyone can update organization logos."
on "storage"."objects"
as permissive
for update
to public
using ((bucket_id = 'organization_logos'::text))
with check ((bucket_id = 'organization_logos'::text));


create policy "Anyone can upload avatars."
on "storage"."objects"
as permissive
for insert
to public
with check ((bucket_id = 'user_avatars'::text));


create policy "Anyone can upload organization logos."
on "storage"."objects"
as permissive
for insert
to public
with check ((bucket_id = 'organization_logos'::text));


create policy "Organization logos are publicly accessible."
on "storage"."objects"
as permissive
for select
to public
using ((bucket_id = 'organization_logos'::text));


create policy "User avatars are publicly accessible."
on "storage"."objects"
as permissive
for select
to public
using ((bucket_id = 'user_avatars'::text));


create policy "Users can update their own avatar."
on "storage"."objects"
as permissive
for update
to public
using (((bucket_id = 'user_avatars'::text) AND (auth.uid() = owner)))
with check ((bucket_id = 'user_avatars'::text));



