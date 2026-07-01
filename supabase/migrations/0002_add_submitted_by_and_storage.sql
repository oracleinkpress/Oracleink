-- Migration: Add submitted_by column to articles and configure manuscripts storage bucket

-- 1. Alter articles table to link to auth.users
alter table articles 
add column if not exists submitted_by uuid references auth.users(id) default auth.uid();

-- 2. Drop existing RLS policies on articles to avoid overlaps
drop policy if exists "Articles modifiable by editors/admins or authors who submitted" on articles;
drop policy if exists "Unpublished articles readable by editors, reviewers, authors" on articles;

-- 3. Create updated RLS policies on articles
create policy "Authors can insert their own articles" on articles
  for insert with check (
    auth.role() = 'authenticated' and
    auth.uid() = submitted_by
  );

create policy "Authors can update their own unpublished articles" on articles
  for update using (
    auth.role() = 'authenticated' and
    auth.uid() = submitted_by and
    status in ('submitted', 'revision_requested')
  );

create policy "Unpublished articles visible to editors, reviewers, or submitting author" on articles
  for select using (
    auth.role() = 'authenticated' and (
      auth.uid() = submitted_by or
      exists (
        select 1 from user_roles 
        where user_roles.user_id = auth.uid() 
        and user_roles.journal_id = articles.journal_id
        and user_roles.role in ('editor', 'journal_admin', 'platform_admin')
      ) or
      exists (
        select 1 from review_assignments
        where review_assignments.article_id = articles.id
        and review_assignments.reviewer_user_id = auth.uid()
      )
    )
  );

create policy "Editors/Admins have full access to articles" on articles
  for all using (
    auth.role() = 'authenticated' and
    exists (
      select 1 from user_roles
      where user_roles.user_id = auth.uid()
      and user_roles.journal_id = articles.journal_id
      and user_roles.role in ('editor', 'journal_admin', 'platform_admin')
    )
  );

-- 4. Create Manuscripts storage bucket
insert into storage.buckets (id, name, public)
values ('manuscripts', 'manuscripts', true)
on conflict (id) do nothing;

-- 5. Create storage RLS policies for manuscripts
create policy "Manuscripts are publicly accessible" on storage.objects
  for select using (bucket_id = 'manuscripts');

create policy "Authenticated users can upload manuscripts" on storage.objects
  for insert with check (
    bucket_id = 'manuscripts' and 
    auth.role() = 'authenticated'
  );

create policy "Authenticated users can delete/update own manuscripts" on storage.objects
  for all using (
    bucket_id = 'manuscripts' and
    auth.role() = 'authenticated' and
    owner = auth.uid()
  );
