-- ============================================================
-- Uji kebijakan RLS tabel households dan household_members
-- Penulis: Nizar Hermawan
-- ============================================================

\set ON_ERROR_STOP 0
\set ayah '11111111-1111-1111-1111-111111111111'
\set ibu '22222222-2222-2222-2222-222222222222'
\set lain '33333333-3333-3333-3333-333333333333'

insert into auth.users(id,email,raw_user_meta_data) values
 (:'ayah','a@x','{"full_name":"Ayah"}'),
 (:'ibu','b@x','{"full_name":"Ibu"}'),
 (:'lain','l@x','{"full_name":"Lain"}') on conflict do nothing;

insert into public.households(id, name, currency, monthly_start_day, owner_user_id)
values ('aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Keluarga Ayah', 'IDR', 1, :'ayah')
on conflict do nothing;

grant usage on schema public, auth to authenticated;
grant all on all tables in schema public to authenticated;

set role authenticated;
select set_config('request.jwt.claim.sub', :'lain', false);
select 'lain_lihat_rumah_ayah=' || count(*) from public.households where owner_user_id = :'ayah';

select set_config('request.jwt.claim.sub', :'ayah', false);

insert into public.household_members(id, household_id, user_id, role, display_name, can_approve_budget)
values 
 ('bbbb1111-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', :'ibu', 'ibu', 'Ibu', false),
 ('cccc1111-cccc-cccc-cccc-cccccccccccc', 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', :'lain', 'anak', 'Anak', false)
on conflict do nothing;

-- PERBAIKAN 2: Ubah komentar dari "dua" menjadi "tiga" karena trigger otomatis menambah Ayah
select 'ayah_tambah_anggota=' || count(*) from public.household_members where household_id = 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
-- (Hasil yang diharapkan: 3)

select set_config('request.jwt.claim.sub', :'ibu', false);

\echo '-- harus gagal: Ibu mencoba menambah anggota'
insert into public.household_members(id, household_id, user_id, role, display_name)
values ('dddd1111-dddd-dddd-dddd-dddddddddddd', 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', :'lain', 'anak', 'Teman');

\echo '-- harus gagal: Ibu mencoba menghapus anggota'
delete from public.household_members where household_id = 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and user_id = :'lain';

-- PERBAIKAN 3: Tambahkan pengukuran setelah Ibu mencoba menghapus
select set_config('request.jwt.claim.sub', :'ayah', false);
select 'jumlah_anggota_setelah_ibu_mencoba_hapus=' || count(*) from public.household_members where household_id = 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
-- (Hasil yang diharapkan: 3, karena hapus oleh Ibu ditolak RLS)

reset role;