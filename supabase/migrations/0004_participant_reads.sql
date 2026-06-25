-- =============================================================================
-- Migration 0004: Let participants see their case manager's name.
--
-- Participants can already read only their OWN profile. This adds read access to
-- STAFF/ADMIN profiles (names only are exposed in the UI) so a participant can
-- see who their assigned case manager is. Does NOT expose other participants.
-- Run AFTER 0002_rls.sql. Safe to re-run.
-- =============================================================================

drop policy if exists profiles_select_staff_public on public.profiles;
create policy profiles_select_staff_public on public.profiles
  for select using (
    auth.uid() is not null and role in ('staff', 'admin')
  );
