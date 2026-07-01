-- Seed database with initial test journal and demo articles (JASE)

-- 1. Insert JASE Journal
insert into journals (id, slug, name, issn_online, issn_print, subject_area, aims_scope, publisher_name, logo_url, theme_color, status)
values (
  'a3b1a135-777c-474c-a1d2-06b23d9b4b9b',
  'jase',
  'Journal of Agricultural Sciences and Engineering',
  '2676-5675',
  '2676-5667',
  'Agricultural Sciences',
  'The Journal of Agricultural Sciences and Engineering (JASE) is a peer-reviewed, open-access journal dedicated to publishing high-quality papers in all fields of agricultural sciences and engineering. The journal aims to provide a platform for researchers and academicians to share their findings on crop science, soil fertility, plant breeding, biological control, entomology, and modern agricultural technologies.',
  'Oracle Ink Press',
  '/journals/jase/logo.png',
  '#1a3c6e',
  'active'
)
on conflict (slug) do update set
  name = excluded.name,
  issn_online = excluded.issn_online,
  issn_print = excluded.issn_print,
  aims_scope = excluded.aims_scope;

-- 2. Insert Editorial Board Members for JASE
insert into editorial_board (journal_id, name, role, affiliation, order_index)
values 
  ('a3b1a135-777c-474c-a1d2-06b23d9b4b9b', 'Dr. Ali Reza', 'Editor-in-Chief', 'University of Tehran, Department of Agronomy', 1),
  ('a3b1a135-777c-474c-a1d2-06b23d9b4b9b', 'Dr. Maria Santos', 'Associate Editor', 'University of Lisbon, Soil Science Lab', 2),
  ('a3b1a135-777c-474c-a1d2-06b23d9b4b9b', 'Dr. John Doe', 'Reviewer', 'California State University, Entomology Department', 3)
on conflict do nothing;

-- 3. Insert Volumes
insert into volumes (id, journal_id, volume_number, year)
values ('b5c1a135-888c-474c-a1d2-06b23d9b4b9b', 'a3b1a135-777c-474c-a1d2-06b23d9b4b9b', 1, 2026)
on conflict (journal_id, volume_number) do update set
  year = excluded.year;

-- 4. Insert Issues
insert into issues (id, volume_id, issue_number, publish_date, cover_image)
values ('c7d1a135-999c-474c-a1d2-06b23d9b4b9b', 'b5c1a135-888c-474c-a1d2-06b23d9b4b9b', 1, '2026-07-01', '/journals/jase/issues/v1i1-cover.jpg')
on conflict do nothing;

-- 5. Insert Authors
insert into authors (id, full_name, email, affiliation, orcid, country)
values 
  ('d9e1a135-000c-474c-a1d2-06b23d9b4b9b', 'Dr. Shikha Sharma', 'shikha@example.com', 'Indian Agricultural Research Institute', '0000-0002-1825-0097', 'India'),
  ('e1f1a135-111c-474c-a1d2-06b23d9b4b9b', 'Dr. Amit Patel', 'amit.patel@example.com', 'Indian Agricultural Research Institute', '0000-0003-2415-8812', 'India')
on conflict do nothing;

-- 6. Insert Published Article
insert into articles (id, journal_id, issue_id, slug, title, abstract, keywords, content_html, pdf_url, doi, first_page, last_page, status, submitted_at, published_at)
values (
  'f3a1a135-222c-474c-a1d2-06b23d9b4b9b',
  'a3b1a135-777c-474c-a1d2-06b23d9b4b9b',
  'c7d1a135-999c-474c-a1d2-06b23d9b4b9b',
  'effect-of-salinity-stress-on-growth-and-yield-of-major-cereal-crops',
  'Effect of Salinity Stress on Growth and Yield of Major Cereal Crops',
  'Salinity is one of the most critical environmental constraints limiting agricultural productivity worldwide. This review evaluates the physiological and biochemical responses of major cereal crops (rice, wheat, and maize) to salinity stress. We analyze the mechanisms of osmotic tolerance and ion exclusion, and summarize breeding and genetic approaches to enhance salinity tolerance. Recent trials demonstrate that combined application of biochar and plant growth-promoting rhizobacteria (PGPR) can mitigate yield losses by up to 24% under moderate salinity conditions (8 dS/m). We recommend integrated soil-crop management practices for sustainable cultivation in salt-affected areas.',
  array['salinity stress', 'cereal crops', 'osmotic tolerance', 'soil fertility', 'sustainable agriculture'],
  '<h2>Introduction</h2><p>Soil salinity affects over 20% of irrigated agricultural land worldwide, posing a major threat to global food security. Cereal crops, which form the staple diet of the majority of the human population, are particularly sensitive to elevated salt levels during their early vegetative and reproductive stages.</p><h2>Physiological Responses</h2><p>Elevated levels of sodium (Na+) and chloride (Cl-) in the soil solution limit root water uptake, inducing osmotic stress. Over time, accumulation of Na+ in leaves triggers ion toxicity, inhibiting photosynthesis and enzyme activities. Plants employ various mechanisms, including sodium exclusion at the root level and vacuolar sequestration, to survive these conditions.</p><h2>Mitigation Strategies</h2><p>Integrated management combining salt-tolerant crop cultivars with soil amendments has shown promising results. In trials conducted over the past 12 months, the application of organic biochar significantly improved soil structure and water-holding capacity, reducing Na+ uptake in cereal crops.</p>',
  '/journals/jase/articles/effect-of-salinity-stress.pdf',
  '[PENDING]',
  1,
  12,
  'published',
  '2026-05-15T10:00:00Z',
  '2026-07-01T12:00:00Z'
)
on conflict (journal_id, slug) do update set
  title = excluded.title,
  abstract = excluded.abstract,
  content_html = excluded.content_html;

-- 7. Associate Authors with Article
insert into article_authors (article_id, author_id, author_order, is_corresponding)
values 
  ('f3a1a135-222c-474c-a1d2-06b23d9b4b9b', 'd9e1a135-000c-474c-a1d2-06b23d9b4b9b', 1, true),
  ('f3a1a135-222c-474c-a1d2-06b23d9b4b9b', 'e1f1a135-111c-474c-a1d2-06b23d9b4b9b', 2, false)
on conflict do nothing;
