alter table public.courses
  add column if not exists topic text not null default '';

alter table public.quiz_questions
  add column if not exists subject text not null default 'Physiology' references public.subjects(name),
  add column if not exists topic text not null default '',
  add column if not exists academic_level text not null default 'Intermediate'
    check (academic_level in ('Beginner', 'Intermediate', 'University')),
  add column if not exists source_type text not null default 'practice'
    check (source_type in ('practice', 'past_exam')),
  add column if not exists exam_year integer,
  add column if not exists source_label text;

update public.quiz_questions
set topic = case id
  when 'homeostasis-description' then 'Homeostasis'
  when 'neural-plasticity-definition' then 'Neural plasticity'
  when 'negative-feedback' then 'Negative feedback'
  else topic
end
where topic = '';

alter table public.learning_activity
  drop constraint if exists learning_activity_event_type_check;
alter table public.learning_activity
  add constraint learning_activity_event_type_check
  check (event_type in (
    'term_view',
    'bookmark',
    'lesson_complete',
    'quiz_answer',
    'flashcard_review',
    'study_goal_created',
    'study_goal_completed'
  ));

create table public.tutorial_videos (
  id text primary key,
  title text not null,
  description text not null,
  learning_objectives text[] not null default '{}',
  subject text not null references public.subjects(name),
  course_id text references public.courses(id) on delete set null,
  topic text not null default '',
  academic_level text not null default 'Beginner'
    check (academic_level in ('Beginner', 'Intermediate', 'University')),
  provider text not null,
  provider_video_id text,
  url text not null,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.learning_materials (
  id text primary key,
  title text not null,
  description text not null,
  subject text not null references public.subjects(name),
  course_id text references public.courses(id) on delete set null,
  topic text not null default '',
  academic_level text not null default 'Beginner'
    check (academic_level in ('Beginner', 'Intermediate', 'University')),
  mime_type text not null,
  file_name text not null,
  storage_path text,
  external_url text,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint learning_materials_location_required check (
    (storage_path is not null and external_url is null)
    or (storage_path is null and external_url is not null)
  )
);

create table public.study_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  description text not null default '',
  target_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.flashcard_reviews (
  user_id uuid not null references auth.users(id) on delete cascade,
  term_id text not null references public.terms(id) on delete cascade,
  due_at timestamptz not null default now(),
  interval_days integer not null default 0 check (interval_days >= 0),
  repetitions integer not null default 0 check (repetitions >= 0),
  ease_factor numeric(4, 2) not null default 2.5 check (ease_factor >= 1.3),
  last_reviewed_at timestamptz,
  primary key (user_id, term_id)
);

create table public.video_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id text not null references public.tutorial_videos(id) on delete cascade,
  position_seconds integer not null default 0 check (position_seconds >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

create index tutorial_videos_subject_topic_idx
  on public.tutorial_videos (subject, topic, academic_level);
create index learning_materials_subject_topic_idx
  on public.learning_materials (subject, topic, academic_level);
create index study_goals_user_created_at_idx
  on public.study_goals (user_id, created_at desc);
create index flashcard_reviews_user_due_at_idx
  on public.flashcard_reviews (user_id, due_at);

alter table public.tutorial_videos enable row level security;
alter table public.learning_materials enable row level security;
alter table public.study_goals enable row level security;
alter table public.flashcard_reviews enable row level security;
alter table public.video_progress enable row level security;

grant select on public.tutorial_videos, public.learning_materials to authenticated;
grant select, insert, update, delete on public.study_goals to authenticated;
grant select, insert, update on public.flashcard_reviews, public.video_progress to authenticated;

create policy "Authenticated users can read tutorial videos" on public.tutorial_videos
  for select to authenticated using (true);
create policy "Authenticated users can read learning materials" on public.learning_materials
  for select to authenticated using (true);

create policy "Users can read their study goals" on public.study_goals
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create their study goals" on public.study_goals
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their study goals" on public.study_goals
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete their study goals" on public.study_goals
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users can read their flashcard reviews" on public.flashcard_reviews
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create their flashcard reviews" on public.flashcard_reviews
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their flashcard reviews" on public.flashcard_reviews
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can read their video progress" on public.video_progress
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create their video progress" on public.video_progress
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their video progress" on public.video_progress
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'learning-materials',
  'learning-materials',
  false,
  52428800,
  array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Authenticated users can download learning materials"
  on storage.objects for select to authenticated
  using (bucket_id = 'learning-materials');

create function public.log_flashcard_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.learning_activity (user_id, event_type, target_type, target_id, target_label)
  select new.user_id, 'flashcard_review', 'term', new.term_id, 'Reviewed: ' || name
  from public.terms
  where id = new.term_id;
  return new;
end;
$$;

create trigger log_flashcard_review_activity
  after insert or update of last_reviewed_at on public.flashcard_reviews
  for each row
  when (new.last_reviewed_at is not null)
  execute function public.log_flashcard_review();

create function public.log_study_goal_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.learning_activity (user_id, event_type, target_type, target_id, target_label)
    values (new.user_id, 'study_goal_created', 'study_goal', new.id::text, 'Set goal: ' || new.title);
  elsif new.completed_at is not null and old.completed_at is distinct from new.completed_at then
    insert into public.learning_activity (user_id, event_type, target_type, target_id, target_label)
    values (new.user_id, 'study_goal_completed', 'study_goal', new.id::text, 'Completed goal: ' || new.title);
  end if;
  return new;
end;
$$;

create trigger log_study_goal_created_activity
  after insert on public.study_goals
  for each row execute function public.log_study_goal_activity();

create trigger log_study_goal_completed_activity
  after update of completed_at on public.study_goals
  for each row execute function public.log_study_goal_activity();
