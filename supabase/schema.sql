-- Run this once in the Supabase project's SQL Editor (Dashboard -> SQL Editor -> New query)
-- before the app's Save button will work. Safe to re-run (idempotent).

create table if not exists tracker_meta (
  id text primary key default 'singleton',
  title text not null default 'Endorsement Desk'
);

insert into tracker_meta (id, title)
values ('singleton', 'Social Media Endorsement Desk')
on conflict (id) do nothing;

create table if not exists endorsement_rows (
  id integer primary key,
  date text,
  author text,
  category text,
  task text,
  done boolean not null default false,
  status text,
  due text,
  due_note text,
  qa boolean not null default false,
  platform text,
  creatives text,
  publicist text,
  note text
);

insert into endorsement_rows (id, date, author, category, task, done, status, due, due_note, qa, platform, creatives, publicist, note) values
  (1, '2026-08-27', 'Patricia Schoeler', 'MONTH 1', 'For Designs', true, 'DONE', '2026-08-27', '', true, 'FACEBOOK', 'JED', 'Kortney', ''),
  (2, '2026-08-27', 'Marty Tilley', 'MONTH 1', 'For Designs', true, 'DONE', '2026-08-06', '', true, 'FACEBOOK', 'JED', 'Ethan', ''),
  (3, '2026-08-27', 'Frank lutz', 'PROPOSAL', 'For Changes', true, 'DONE', '2026-08-20', '', true, 'FACEBOOK', 'CATH', 'Kortney', '')
on conflict (id) do nothing;
