-- 0007_courses.sql
-- Learning Management System: real courses (workforce readiness, emotional
-- readiness, digital, and 5 trade tracks) with lessons, trade-simulation
-- placeholders, graded quizzes, and per-participant progress + quiz scores.
-- Additive and safe to re-run (idempotent). Content is loaded by the seed
-- script from supabase/content/courses.json.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'lesson_kind') then
    create type lesson_kind as enum ('reading', 'simulation', 'video', 'quiz');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Catalog: courses -> lessons ; courses -> quiz -> quiz_questions
-- ---------------------------------------------------------------------------
create table if not exists public.courses (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  track       text not null,                 -- workforce_readiness | emotional_readiness | digital | trades
  title       text not null,
  description text,
  tier        program_tier,                  -- optional mapping to the 3-tier program
  is_trade    boolean not null default false,
  icon        text,                          -- lucide-react icon name
  est_hours   numeric,
  sequence    int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.lessons (
  id              uuid primary key default gen_random_uuid(),
  course_id       uuid not null references public.courses(id) on delete cascade,
  slug            text not null,
  title           text not null,
  kind            lesson_kind not null default 'reading',
  sequence        int not null default 0,
  content         text,
  sim_type        text,
  sim_inspiration text,
  created_at      timestamptz not null default now(),
  unique (course_id, slug)
);

create table if not exists public.quizzes (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses(id) on delete cascade,
  title       text not null,
  pass_score  int not null default 70,
  created_at  timestamptz not null default now(),
  unique (course_id)
);

create table if not exists public.quiz_questions (
  id            uuid primary key default gen_random_uuid(),
  quiz_id       uuid not null references public.quizzes(id) on delete cascade,
  sequence      int not null default 0,
  prompt        text not null,
  options       jsonb not null,              -- array of 4 option strings
  correct_index int not null,
  explanation   text
);

-- ---------------------------------------------------------------------------
-- Participant progress + quiz scores
-- ---------------------------------------------------------------------------
create table if not exists public.course_progress (
  id             uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  course_id      uuid not null references public.courses(id) on delete cascade,
  status         progress_status not null default 'not_started',
  completion_pct int not null default 0,
  started_at     timestamptz,
  completed_at   timestamptz,
  updated_at     timestamptz not null default now(),
  unique (participant_id, course_id)
);

create table if not exists public.course_lesson_progress (
  id             uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  lesson_id      uuid not null references public.lessons(id) on delete cascade,
  status         progress_status not null default 'not_started',
  completed_at   timestamptz,
  unique (participant_id, lesson_id)
);

create table if not exists public.quiz_attempts (
  id             uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  quiz_id        uuid not null references public.quizzes(id) on delete cascade,
  score          int not null,
  passed         boolean not null default false,
  answers        jsonb,
  taken_at       timestamptz not null default now()
);

-- Indexes
create index if not exists idx_lessons_course on public.lessons(course_id);
create index if not exists idx_quiz_questions_quiz on public.quiz_questions(quiz_id);
create index if not exists idx_course_progress_part on public.course_progress(participant_id);
create index if not exists idx_course_lesson_progress_part on public.course_lesson_progress(participant_id);
create index if not exists idx_quiz_attempts_part on public.quiz_attempts(participant_id);

-- updated_at triggers
drop trigger if exists trg_courses_updated on public.courses;
create trigger trg_courses_updated before update on public.courses
  for each row execute function public.set_updated_at();
drop trigger if exists trg_course_progress_updated on public.course_progress;
create trigger trg_course_progress_updated before update on public.course_progress
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.courses                enable row level security;
alter table public.lessons                enable row level security;
alter table public.quizzes                enable row level security;
alter table public.quiz_questions         enable row level security;
alter table public.course_progress        enable row level security;
alter table public.course_lesson_progress enable row level security;
alter table public.quiz_attempts          enable row level security;

-- Catalog content: readable by any signed-in user.
do $$
declare t text;
begin
  foreach t in array array['courses','lessons','quizzes','quiz_questions']
  loop
    execute format('drop policy if exists %I_select on public.%I;', t, t);
    execute format('create policy %I_select on public.%I for select using (auth.uid() is not null);', t, t);
  end loop;
end $$;

-- Progress + attempts: participant sees/writes own; staff/admin/super see all.
do $$
declare t text;
begin
  foreach t in array array['course_progress','course_lesson_progress','quiz_attempts']
  loop
    execute format('drop policy if exists %I_select on public.%I;', t, t);
    execute format($p$create policy %I_select on public.%I for select
        using (public.is_staff_or_admin() or participant_id = public.my_participant_id());$p$, t, t);
    execute format('drop policy if exists %I_insert on public.%I;', t, t);
    execute format($p$create policy %I_insert on public.%I for insert
        with check (participant_id = public.my_participant_id() or public.is_staff_or_admin());$p$, t, t);
    execute format('drop policy if exists %I_update on public.%I;', t, t);
    execute format($p$create policy %I_update on public.%I for update
        using (participant_id = public.my_participant_id() or public.is_staff_or_admin());$p$, t, t);
  end loop;
end $$;
