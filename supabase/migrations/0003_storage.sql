-- =============================================================================
-- Migration 0003: Storage bucket + policies for participant documents
--
-- Files are stored under  documents/{participant_id}/{filename}
-- so the first path segment scopes access to the owning participant.
-- Run AFTER 0002_rls.sql. Safe to re-run.
-- =============================================================================

-- Private bucket (not public): all access flows through the policies below.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

drop policy if exists "documents read own or staff" on storage.objects;
drop policy if exists "documents insert own or staff" on storage.objects;
drop policy if exists "documents update staff" on storage.objects;
drop policy if exists "documents delete staff" on storage.objects;

-- Read: participant may read files under their own folder; staff/admin read all.
create policy "documents read own or staff" on storage.objects
  for select using (
    bucket_id = 'documents'
    and (
      public.is_staff_or_admin()
      or (storage.foldername(name))[1] = public.my_participant_id()::text
    )
  );

-- Insert: participant may upload into their own folder; staff/admin anywhere.
create policy "documents insert own or staff" on storage.objects
  for insert with check (
    bucket_id = 'documents'
    and (
      public.is_staff_or_admin()
      or (storage.foldername(name))[1] = public.my_participant_id()::text
    )
  );

-- Update / delete: staff/admin only (keeps participant uploads immutable).
create policy "documents update staff" on storage.objects
  for update using (bucket_id = 'documents' and public.is_staff_or_admin());

create policy "documents delete staff" on storage.objects
  for delete using (bucket_id = 'documents' and public.is_staff_or_admin());
