-- Migration: Add database indexes to optimize query speeds at scale (100+ journals, thousands of articles)

-- 1. Optimize article queries (homepage directories, sitemaps, details, and dynamic rewrites)
create index if not exists idx_articles_journal_status on articles(journal_id, status);
create index if not exists idx_articles_slug on articles(slug);
create index if not exists idx_articles_submitted_by on articles(submitted_by);

-- 2. Optimize volume and issue lookups (archive timelines and tables of contents)
create index if not exists idx_volumes_journal_id on volumes(journal_id);
create index if not exists idx_issues_volume_id on issues(volume_id);

-- 3. Optimize editorial board listings
create index if not exists idx_editorial_board_journal_id on editorial_board(journal_id);

-- 4. Optimize user role permissions and dashboard checks
create index if not exists idx_user_roles_user_id on user_roles(user_id);
create index if not exists idx_user_roles_journal_id on user_roles(journal_id);

-- 5. Optimize review assignments queries (Reviewer Dashboard lookup)
create index if not exists idx_review_assignments_reviewer on review_assignments(reviewer_user_id);
create index if not exists idx_review_assignments_article on review_assignments(article_id);

-- 6. Optimize article author junction lookups
create index if not exists idx_article_authors_article on article_authors(article_id);
create index if not exists idx_article_authors_author on article_authors(author_id);
