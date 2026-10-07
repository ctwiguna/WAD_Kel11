-- ============================================================
-- Uji kebijakan RLS tabel households dan household_members
-- Penulis: Nizar Hermawan
-- Jalankan setelah rls_prelude.sql dan migrasi 0001 sampai 0003 terpasang.
-- ============================================================

\set ON_ERROR_STOP 0
\set ayah '11111111-1111-1111-1111-111111111111'
\set ibu '22222222-2222-2222-2222-222222222222'
\set lain '33333333-3333-3333-3333-333333333333'

-- 1. Setup Data Awal
-- Pastikan user ada di auth.users (jika belum ada dari rls_profil.sql)
insert into auth.users(id,email,raw_user_meta_data) values
 (:'ayah','a@x','{"full_name":"Ayah"}'),
 (:'ibu','b@x','{"full_name":"Ibu"}'),
 (:'lain','l@x','{"full_name":"Lain"}') on conflict do nothing;

-- Ayah membuat satu rumah tangga
insert into public.households(id, name, currency, monthly_start_day, owner_user_id)
values ('aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Keluarga Ayah', 'IDR', 1, :'ayah')
on conflict do nothing;

grant usage on schema public, auth to authenticated;
grant all on all tables in schema public to authenticated;

-- ============================================================
-- 2. Uji Lintas Rumah Tangga (Anggota lain tidak terlihat)
-- ============================================================
set role authenticated;
select set_config('request.jwt.claim.sub', :'lain', false);

-- Orang luar (Lain) TIDAK BOLEH melihat rumah tangga Ayah
select 'lain_lihat_rumah_ayah=' || count(*) from public.households where owner_user_id = :'ayah';
-- (Hasil yang diharapkan: 0)

-- ============================================================
-- 3. Uji Peran: Hanya Ayah yang boleh menambah/mengubah anggota
-- ============================================================

-- Login sebagai Ayah
select set_config('request.jwt.claim.sub', :'ayah', false);

-- Ayah menambahkan Ibu dan Lain sebagai anggota
insert into public.household_members(id, household_id, user_id, role, display_name, can_approve_budget)
values 
 ('bbbb1111-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', :'ibu', 'ibu', 'Ibu', false),
 ('cccc1111-cccc-cccc-cccc-cccccccccccc', 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', :'lain', 'anak', 'Anak', false)
on conflict do nothing;

select 'ayah_tambah_anggota=' || count(*) from public.household_members where household_id = 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
-- (Hasil yang diharapkan: 2)

-- Login sebagai Ibu
select set_config('request.jwt.claim.sub', :'ibu', false);

-- Ibu TIDAK BOLEH menambah anggota baru (harus gagal/ditolak RLS)
\echo '-- harus gagal: Ibu mencoba menambah anggota'
insert into public.household_members(id, household_id, user_id, role, display_name)
values ('dddd1111-dddd-dddd-dddd-dddddddddddd', 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', :'lain', 'anak', 'Teman');

-- Ibu TIDAK BOLEH mengeluarkan/menghapus anggota (harus gagal/ditolak RLS)
\echo '-- harus gagal: Ibu mencoba menghapus anggota'
delete from public.household_members where household_id = 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and user_id = :'lain';

-- ============================================================
-- 4. Uji Ayah Mengeluarkan Anggota
-- ============================================================

-- Login kembali sebagai Ayah
select set_config('request.jwt.claim.sub', :'ayah', false);

-- Ayah BOLEH mengeluarkan anggota Lain
delete from public.household_members where household_id = 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and user_id = :'lain';
select 'ayah_hapus_anggota_lain=' || count(*) from public.household_members where user_id = :'lain';
-- (Hasil yang diharapkan: 0)

-- Reset role
reset role;