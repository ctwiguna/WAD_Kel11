-- ============================================================
-- Migrasi hak akses tabel untuk peran Supabase
-- Dipasang setelah seluruh tabel dan kebijakan RLS dibuat (0001 sampai 0009).
-- Tanpa berkas ini, peran anon, authenticated, dan service_role tidak punya
-- hak apa pun sehingga PostgREST menjawab permission denied for table.
-- Baris data tetap dijaga kebijakan RLS, jadi hak tabel tidak membuka data.
-- ============================================================

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;

alter default privileges in schema public
    grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
    grant all on sequences to anon, authenticated, service_role;
