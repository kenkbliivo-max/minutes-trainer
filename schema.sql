-- 議事録練習アプリ スキーマ (SupabaseのSQL Editorで実行してください)

create table if not exists users (
  id serial primary key,
  email text unique not null,
  nickname text not null,
  password_hash text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists meetings (
  id uuid primary key default gen_random_uuid(),
  user_id integer not null references users(id) on delete cascade,
  title text not null,
  theme text not null,
  difficulty integer not null default 1,
  length text not null default 'medium',
  participants jsonb not null default '[]',
  utterances jsonb not null default '[]',
  no_rewind boolean not null default false,
  time_limit_minutes integer,
  timer_started_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  user_id integer not null references users(id) on delete cascade,
  attempt integer not null default 1,
  pdf_filename text,
  pdf_data bytea,
  extracted_text text,
  total_score integer,
  criteria jsonb,
  good_points jsonb,
  weak_points jsonb,
  improvements jsonb,
  model_answer text,
  comparison text,
  focus_points jsonb,
  duration_seconds integer,
  overtime boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists usage_counters (
  user_id integer not null references users(id) on delete cascade,
  day date not null,
  generates integer not null default 0,
  scores integer not null default 0,
  primary key (user_id, day)
);

create index if not exists idx_meetings_user on meetings(user_id);
create index if not exists idx_submissions_user on submissions(user_id);
create index if not exists idx_submissions_meeting on submissions(meeting_id);
