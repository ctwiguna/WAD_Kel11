-- uji kebijakan RLS tabel profiles di PostgreSQL lokal
-- Penulis: Chandra TW
-- Jalankan setelah rls_prelude.sql dan migrasi 0001 sampai 0002 terpasang.
\set ON_ERROR_STOP 0
\set ayah '11111111-1111-1111-1111-111111111111'
\set ibu '22222222-2222-2222-2222-222222222222'
\set lain '33333333-3333-3333-3333-333333333333'

insert into auth.users(id,email,raw_user_meta_data) values
 (:'ayah','a@x','{"full_name":"Ayah"}'),
 (:'ibu','b@x','{"full_name":"Ibu"}'),
 (:'lain','l@x','{"full_name":"Lain"}') on conflict do nothing;
select 'profil_otomatis=' || count(*) from public.profiles;

grant usage on schema public, auth to authenticated;
grant all on all tables in schema public to authenticated;

set role authenticated;
select set_config('request.jwt.claim.sub', :'ayah', false);
select 'ayah_lihat_profil=' || count(*) from public.profiles;
\echo '-- harus gagal: menambah profil untuk orang lain'
insert into public.profiles(id,email,full_name) values (:'lain','palsu@x','Palsu');
\echo '-- harus gagal: mengubah profil orang lain'
with t as (update public.profiles set full_name='Diubah' where id = :'ibu' returning 1) select 'ayah_ubah_profil_ibu=' || count(*) from t;
with t as (update public.profiles set full_name='Ayah Baru' where id = :'ayah' returning 1) select 'ayah_ubah_profil_sendiri=' || count(*) from t;

select set_config('request.jwt.claim.sub', :'ibu', false);
select 'ibu_lihat_profil=' || count(*) from public.profiles;
select 'ibu_lihat_baris_ayah=' || count(*) from public.profiles where id = :'ayah';
