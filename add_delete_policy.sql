-- Run this in Supabase SQL Editor to allow parents to delete their own
-- absence reports (needed for the new "X" button on My Notices).
create policy "delete own reports"
  on bloom_absence_reports for delete
  using (auth.jwt() ->> 'email' = submitted_by_email);
