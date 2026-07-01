-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- 1. Journals table
create table journals (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,             -- becomes subdomain: slug.platformdomain.com
  name text not null,
  issn_online text,
  issn_print text,
  subject_area text,
  aims_scope text,                        -- long-form markdown
  publisher_name text default 'Oracle Ink Press',
  logo_url text,
  theme_color text,
  custom_domain text,                     -- nullable, future use
  status text default 'active',           -- active | paused
  created_at timestamptz default now()
);

-- 2. Editorial Board table
create table editorial_board (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid references journals(id) on delete cascade,
  name text not null,
  role text,                              -- Editor-in-Chief | Associate Editor | Reviewer
  affiliation text,
  order_index int default 0
);

-- 3. Volumes table
create table volumes (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid references journals(id) on delete cascade,
  volume_number int not null,
  year int not null,
  unique(journal_id, volume_number)
);

-- 4. Issues table
create table issues (
  id uuid primary key default gen_random_uuid(),
  volume_id uuid references volumes(id) on delete cascade,
  issue_number int not null,
  publish_date date,
  cover_image text
);

-- 5. Authors table
create table authors (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  affiliation text,
  orcid text,
  country text
);

-- 6. Articles table
create table articles (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid references journals(id) on delete cascade,
  issue_id uuid references issues(id),           -- null until assigned to an issue
  slug text not null,
  title text not null,
  abstract text,
  keywords text[],
  content_html text,                              -- full text, rendered
  pdf_url text,
  doi text default '[PENDING]',                  -- '[PENDING]' until registered
  first_page int,
  last_page int,
  status text default 'submitted',
  -- submitted | under_review | revision_requested | accepted | published | rejected
  submitted_at timestamptz default now(),
  published_at timestamptz,
  view_count int default 0,
  download_count int default 0,
  unique(journal_id, slug)
);

-- 7. Article Authors table (junction table)
create table article_authors (
  article_id uuid references articles(id) on delete cascade,
  author_id uuid references authors(id) on delete cascade,
  author_order int not null,
  is_corresponding boolean default false,
  primary key (article_id, author_id)
);

-- 8. Review Assignments table
create table review_assignments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references articles(id) on delete cascade,
  reviewer_user_id uuid references auth.users(id),
  assigned_at timestamptz default now(),
  status text default 'pending',    -- pending | in_progress | submitted
  recommendation text,               -- accept | minor_revision | major_revision | reject
  comments text,
  submitted_at timestamptz
);

-- 9. User Roles table (associating auth.users with journals and roles)
create table user_roles (
  user_id uuid references auth.users(id) on delete cascade,
  journal_id uuid references journals(id) on delete cascade,
  role text not null,   -- author | reviewer | editor | journal_admin | platform_admin
  primary key (user_id, journal_id, role)
);

-- 10. Payments table (APC payments)
create table payments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references articles(id),
  amount numeric,
  currency text default 'USD',
  stripe_payment_id text,
  status text default 'pending',
  created_at timestamptz default now()
);

-- Enable RLS on all tables
alter table journals enable row level security;
alter table editorial_board enable row level security;
alter table volumes enable row level security;
alter table issues enable row level security;
alter table authors enable row level security;
alter table articles enable row level security;
alter table article_authors enable row level security;
alter table review_assignments enable row level security;
alter table user_roles enable row level security;
alter table payments enable row level security;

-- Setup RLS Policies

-- Journals: Publicly readable, modifiable by platform_admins
create policy "Journals are readable by everyone" on journals
  for select using (true);

create policy "Journals can be modified by platform admins" on journals
  for all using (
    exists (
      select 1 from user_roles 
      where user_roles.user_id = auth.uid() 
      and user_roles.role = 'platform_admin'
    )
  );

-- Editorial Board: Publicly readable, modifiable by editors and admins
create policy "Editorial board readable by everyone" on editorial_board
  for select using (true);

create policy "Editorial board modifiable by editors/admins" on editorial_board
  for all using (
    exists (
      select 1 from user_roles 
      where user_roles.user_id = auth.uid() 
      and user_roles.journal_id = editorial_board.journal_id
      and user_roles.role in ('editor', 'journal_admin', 'platform_admin')
    )
  );

-- Volumes: Publicly readable, modifiable by editors and admins
create policy "Volumes readable by everyone" on volumes
  for select using (true);

create policy "Volumes modifiable by editors/admins" on volumes
  for all using (
    exists (
      select 1 from user_roles 
      where user_roles.user_id = auth.uid() 
      and user_roles.journal_id = volumes.journal_id
      and user_roles.role in ('editor', 'journal_admin', 'platform_admin')
    )
  );

-- Issues: Publicly readable, modifiable by editors and admins
create policy "Issues readable by everyone" on issues
  for select using (true);

create policy "Issues modifiable by editors/admins" on issues
  for all using (
    exists (
      select 1 from volumes
      join user_roles on user_roles.journal_id = volumes.journal_id
      where volumes.id = issues.volume_id
      and user_roles.user_id = auth.uid()
      and user_roles.role in ('editor', 'journal_admin', 'platform_admin')
    )
  );

-- Authors: Readable by authenticated users (for searches/submitting), writeable by same
create policy "Authors readable by authenticated users" on authors
  for select using (auth.role() = 'authenticated');

create policy "Authors insertable by authenticated users" on authors
  for insert with check (auth.role() = 'authenticated');

create policy "Authors modifiable by editors/admins" on authors
  for update using (
    exists (
      select 1 from user_roles 
      where user_roles.user_id = auth.uid() 
      and user_roles.role in ('editor', 'journal_admin', 'platform_admin')
    )
  );

-- Articles: Published are publicly readable. Un-published are readable by authors, reviewers, and journal editors.
create policy "Published articles readable by everyone" on articles
  for select using (status = 'published');

create policy "Unpublished articles readable by editors, reviewers, authors" on articles
  for select using (
    auth.role() = 'authenticated' and (
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
      ) or
      exists (
        select 1 from article_authors
        join authors on authors.id = article_authors.author_id
        where article_authors.article_id = articles.id
        and authors.email = auth.email()
      )
    )
  );

create policy "Articles modifiable by editors/admins or authors who submitted" on articles
  for all using (
    auth.role() = 'authenticated' and (
      exists (
        select 1 from user_roles 
        where user_roles.user_id = auth.uid() 
        and user_roles.journal_id = articles.journal_id
        and user_roles.role in ('editor', 'journal_admin', 'platform_admin')
      ) or
      (
        -- Allow insertion/updating by authors for their submissions
        status = 'submitted'
      )
    )
  );

-- Article Authors: Publicly readable for published articles, editable by authors and editors
create policy "Article authors readable by everyone for published articles" on article_authors
  for select using (
    exists (
      select 1 from articles 
      where articles.id = article_authors.article_id 
      and articles.status = 'published'
    )
  );

create policy "Article authors readable by editors and authors for unpublished" on article_authors
  for select using (
    auth.role() = 'authenticated'
  );

create policy "Article authors modifiable by editors and authors" on article_authors
  for all using (
    auth.role() = 'authenticated'
  );

-- Review Assignments: Scoped to editors and the assigned reviewer
create policy "Review assignments visible to editors and assigned reviewer" on review_assignments
  for select using (
    auth.role() = 'authenticated' and (
      reviewer_user_id = auth.uid() or
      exists (
        select 1 from articles
        join user_roles on user_roles.journal_id = articles.journal_id
        where articles.id = review_assignments.article_id
        and user_roles.user_id = auth.uid()
        and user_roles.role in ('editor', 'journal_admin', 'platform_admin')
      )
    )
  );

create policy "Review assignments manageable by editors" on review_assignments
  for all using (
    auth.role() = 'authenticated' and
    exists (
      select 1 from articles
      join user_roles on user_roles.journal_id = articles.journal_id
      where articles.id = review_assignments.article_id
      and user_roles.user_id = auth.uid()
      and user_roles.role in ('editor', 'journal_admin', 'platform_admin')
    )
  );

-- User Roles: Readable by authenticated users, manageable by platform admins
create policy "User roles readable by authenticated users" on user_roles
  for select using (auth.role() = 'authenticated');

create policy "User roles manageable by platform admins" on user_roles
  for all using (
    exists (
      select 1 from user_roles
      where user_roles.user_id = auth.uid()
      and user_roles.role = 'platform_admin'
    )
  );

-- Payments: Visible to editors and paying authors, manageable by system
create policy "Payments readable by editors and paying authors" on payments
  for select using (
    auth.role() = 'authenticated' and (
      exists (
        select 1 from articles
        join user_roles on user_roles.journal_id = articles.journal_id
        where articles.id = payments.article_id
        and user_roles.user_id = auth.uid()
        and user_roles.role in ('editor', 'journal_admin', 'platform_admin')
      ) or
      exists (
        select 1 from articles
        join article_authors on article_authors.article_id = articles.id
        join authors on authors.id = article_authors.author_id
        where articles.id = payments.article_id
        and authors.email = auth.email()
      )
    )
  );
