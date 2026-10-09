-- uji kebijakan RLS tabel transactions dan budgets di PostgreSQL lokal
-- Cadangan disiapkan tim pada 8 Oktober 2026 supaya sesuai timeline.
-- Jalankan sekali pada basis data bersih, setelah rls_prelude.sql dan migrasi 0001 sampai 0009 terpasang.
\set ON_ERROR_STOP 0
\set ayah '11111111-1111-1111-1111-111111111111'
\set ibu  '22222222-2222-2222-2222-222222222222'
\set anak '44444444-4444-4444-4444-444444444444'
\set lain '33333333-3333-3333-3333-333333333333'
\set rt   'aaaaaaaa-1111-1111-1111-111111111111'
\set dompet 'dddddddd-1111-1111-1111-111111111111'
\set kategori 'eeeeeeee-1111-1111-1111-111111111111'

insert into auth.users(id,email,raw_user_meta_data) values
 (:'ayah','a@x','{"full_name":"Ayah"}'),
 (:'ibu','b@x','{"full_name":"Ibu"}'),
 (:'anak','c@x','{"full_name":"Anak"}'),
 (:'lain','l@x','{"full_name":"Lain"}') on conflict do nothing;

-- rumah tangga uji, ayah pemiliknya, ibu dan anak menyusul sebagai anggota
insert into public.households(id,name,owner_user_id) values (:'rt','Keluarga Uji', :'ayah') on conflict do nothing;
insert into public.household_members(id,household_id,user_id,role,display_name) values
 ('bbbbbbbb-2222-2222-2222-222222222222', :'rt', :'ibu','ibu','Ibu'),
 ('cccccccc-3333-3333-3333-333333333333', :'rt', :'anak','anak','Anak')
on conflict do nothing;

select m.id as id_ayah from public.household_members m where m.household_id = :'rt' and m.user_id = :'ayah' \gset
select m.id as id_anak from public.household_members m where m.household_id = :'rt' and m.user_id = :'anak' \gset

insert into public.accounts(id,household_id,name,type,opening_balance) values
 (:'dompet', :'rt','Tunai','cash',0) on conflict do nothing;
insert into public.categories(id,household_id,name,kind) values
 (:'kategori', :'rt','Jajan','expense') on conflict do nothing;

-- dua catatan ayah dan satu catatan anak, ditulis sebagai superuser
insert into public.transactions(household_id,account_id,category_id,member_id,type,amount,txn_date,created_by) values
 (:'rt', :'dompet', :'kategori', :'id_ayah','expense',100000,'2026-09-05', :'ayah'),
 (:'rt', :'dompet', :'kategori', :'id_ayah','expense',250000,'2026-09-10', :'ayah'),
 (:'rt', :'dompet', :'kategori', :'id_anak','expense',15000,'2026-09-12', :'anak');
insert into public.budgets(household_id,category_id,period_month,limit_amount,created_by) values
 (:'rt', :'kategori','2026-09-01',400000, :'ayah');

grant usage on schema public, auth to authenticated;
grant all on all tables in schema public to authenticated;

\echo '== sebagai anak =='
set role authenticated;
select set_config('request.jwt.claim.sub', :'anak', false);
select 'anak_lihat_transaksi=' || count(*) from public.transactions;
select 'anak_lihat_catatan_ayah=' || count(*) from public.transactions where member_id = :'id_ayah';
select 'anak_lihat_anggaran=' || count(*) from public.budgets;
\echo '-- harus gagal: anak menambah anggaran'
insert into public.budgets(household_id,category_id,period_month,limit_amount,created_by)
values (:'rt', :'kategori','2026-10-01',100000, :'anak');
\echo '-- harus tidak mengubah apa pun: anak mengubah catatan ayah'
with t as (update public.transactions set amount = 1 where member_id = :'id_ayah' returning 1)
select 'anak_ubah_catatan_ayah=' || count(*) from t;
insert into public.transactions(household_id,account_id,category_id,member_id,type,amount,txn_date,created_by)
values (:'rt', :'dompet', :'kategori', :'id_anak','expense',5000,'2026-09-13', :'anak');
select 'anak_tambah_catatan_sendiri=' || count(*) from public.transactions;

\echo '== sebagai ayah =='
select set_config('request.jwt.claim.sub', :'ayah', false);
select 'ayah_lihat_transaksi=' || count(*) from public.transactions;
with t as (update public.transactions set amount = 20000 where created_by = :'anak' returning 1)
select 'ayah_ubah_catatan_anak=' || count(*) from t;
insert into public.budgets(household_id,category_id,period_month,limit_amount,created_by)
values (:'rt', :'kategori','2026-10-01',300000, :'ayah');
select 'ayah_tambah_anggaran=' || count(*) from public.budgets where period_month = '2026-10-01';

\echo '== sebagai ibu =='
select set_config('request.jwt.claim.sub', :'ibu', false);
select 'ibu_lihat_transaksi=' || count(*) from public.transactions;
with t as (update public.budgets set limit_amount = 500000 where period_month = '2026-09-01' returning 1)
select 'ibu_ubah_anggaran=' || count(*) from t;

\echo '== rumah tangga lain tidak melihat apa pun =='
select set_config('request.jwt.claim.sub', :'lain', false);
select 'lain_lihat_transaksi=' || count(*) from public.transactions;
select 'lain_lihat_anggaran=' || count(*) from public.budgets;
reset role;