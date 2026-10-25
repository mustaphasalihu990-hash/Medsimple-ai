create extension if not exists pgcrypto;

create table public.subjects (
  name text primary key,
  icon text not null,
  color text not null,
  description text not null,
  sort_order integer not null default 0
);

create table public.terms (
  id text primary key,
  name text not null,
  subject text not null references public.subjects(name),
  pronunciation text not null,
  difficulty text not null check (difficulty in ('Beginner', 'Intermediate', 'University')),
  definition text not null,
  beginner_explanation text not null,
  university_explanation text not null,
  key_points text[] not null default '{}',
  clinical_significance text not null,
  example text not null,
  analogy text not null,
  misconceptions text[] not null default '{}',
  related_terms text[] not null default '{}',
  suggested_visuals text[] not null default '{}',
  videos jsonb not null default '[]'::jsonb,
  resources jsonb not null default '[]'::jsonb,
  practice_questions text[] not null default '{}'
);

create table public.courses (
  id text primary key,
  title text not null,
  subject text not null references public.subjects(name),
  duration text not null,
  lesson_count integer not null check (lesson_count >= 0),
  description text not null,
  sort_order integer not null default 0
);

create table public.lessons (
  id text primary key,
  course_id text not null references public.courses(id) on delete cascade,
  title text not null,
  overview text not null,
  objectives text[] not null default '{}',
  content text not null,
  table_of_contents text[] not null default '{}',
  duration_minutes integer not null default 0 check (duration_minutes >= 0),
  sort_order integer not null default 0
);

create table public.resources (
  id text primary key,
  title text not null,
  source text not null,
  type text not null,
  description text not null,
  relevance text not null,
  url text not null,
  sort_order integer not null default 0
);

create table public.quiz_questions (
  id text primary key,
  question_type text not null,
  question text not null,
  options text[] not null,
  answer text not null,
  explanation text not null,
  sort_order integer not null default 0
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  preferred_level text not null default 'Beginner'
    check (preferred_level in ('Beginner', 'Intermediate', 'University')),
  theme text not null default 'light' check (theme in ('light', 'dark')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade,
  term_id text not null references public.terms(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, term_id)
);

create table public.course_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  updated_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

create table public.lesson_completions (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null references public.lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null references public.quiz_questions(id) on delete cascade,
  selected_answer text not null,
  is_correct boolean not null,
  created_at timestamptz not null default now()
);

create table public.learning_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('term_view', 'bookmark', 'lesson_complete', 'quiz_answer')),
  target_type text not null,
  target_id text not null,
  target_label text not null,
  created_at timestamptz not null default now()
);

create index learning_activity_user_created_at_idx
  on public.learning_activity (user_id, created_at desc);
create index quiz_attempts_user_created_at_idx
  on public.quiz_attempts (user_id, created_at desc);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into public.profiles (id, full_name)
select id, coalesce(raw_user_meta_data ->> 'full_name', '')
from auth.users
on conflict (id) do nothing;

alter table public.subjects enable row level security;
alter table public.terms enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.resources enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.profiles enable row level security;
alter table public.bookmarks enable row level security;
alter table public.course_progress enable row level security;
alter table public.lesson_completions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.learning_activity enable row level security;

grant select on public.subjects, public.terms, public.courses, public.lessons, public.resources, public.quiz_questions
  to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, delete on public.bookmarks, public.lesson_completions to authenticated;
grant select, insert, update on public.course_progress to authenticated;
grant select, insert on public.quiz_attempts, public.learning_activity to authenticated;

create policy "Public can read subjects" on public.subjects for select using (true);
create policy "Public can read terms" on public.terms for select using (true);
create policy "Public can read courses" on public.courses for select using (true);
create policy "Public can read lessons" on public.lessons for select using (true);
create policy "Public can read resources" on public.resources for select using (true);
create policy "Public can read quiz questions" on public.quiz_questions for select using (true);

create policy "Users can read their profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "Users can create their profile" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "Users can update their profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Users can read their bookmarks" on public.bookmarks
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create their bookmarks" on public.bookmarks
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can remove their bookmarks" on public.bookmarks
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users can read their course progress" on public.course_progress
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create their course progress" on public.course_progress
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their course progress" on public.course_progress
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can read their lesson completions" on public.lesson_completions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create their lesson completions" on public.lesson_completions
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can remove their lesson completions" on public.lesson_completions
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users can read their quiz attempts" on public.quiz_attempts
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create their quiz attempts" on public.quiz_attempts
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "Users can read their learning activity" on public.learning_activity
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create their learning activity" on public.learning_activity
  for insert to authenticated with check ((select auth.uid()) = user_id);

insert into public.subjects (name, icon, color, description, sort_order) values
  ('Anatomy', '🧠', 'from-violet-500 to-indigo-500', 'Structure, relationships, and organization of the body.', 1),
  ('Physiology', '🫀', 'from-cyan-500 to-blue-500', 'How living systems function and maintain balance.', 2),
  ('Psychology', '🧭', 'from-rose-500 to-pink-500', 'Behavior, cognition, emotion, and mental processes.', 3),
  ('Biochemistry', '🧪', 'from-emerald-500 to-green-500', 'Chemical processes within living organisms.', 4),
  ('Pharmacology', '💊', 'from-amber-500 to-yellow-500', 'Drugs, mechanisms, and therapeutic applications.', 5),
  ('Nursing', '🩺', 'from-sky-500 to-teal-500', 'Clinical care, patient communication, and safety.', 6),
  ('Microbiology', '🦠', 'from-lime-500 to-emerald-500', 'Microscopic organisms and their effects on health.', 7),
  ('Public health', '🌍', 'from-fuchsia-500 to-violet-500', 'Population health, prevention, and health systems.', 8)
on conflict (name) do nothing;

insert into public.terms (
  id, name, subject, pronunciation, difficulty, definition, beginner_explanation,
  university_explanation, key_points, clinical_significance, example, analogy,
  misconceptions, related_terms, suggested_visuals, videos, resources, practice_questions
) values
  (
    'homeostasis', 'Homeostasis', 'Physiology', 'hoh-mee-oh-STAY-sis', 'Intermediate',
    'The body’s ability to maintain stable internal conditions despite changing external conditions.',
    'Your body is constantly adjusting to keep things like temperature, blood sugar, and water levels in a healthy range.',
    'Homeostasis is a dynamic physiological process involving negative feedback mechanisms, receptor detection, and effector responses to restore equilibrium after internal or external perturbations.',
    array['Keeps the internal environment balanced', 'Uses feedback loops to detect and correct change', 'Essential for safe, stable function'],
    'When homeostasis fails, conditions such as dehydration, fever, or severe metabolic disorders can develop.',
    'When you exercise, your body sweats to cool down and your breathing rate rises to maintain oxygen supply.',
    'Like a thermostat in a room, the body continuously checks conditions and makes small adjustments to keep things steady.',
    array['It means the body is always unchanged.', 'It only happens in one organ or system.'],
    array['Negative feedback', 'Metabolism', 'Set point', 'Osmoregulation'],
    array['Thermostat diagram', 'Feedback loop infographic', 'Body temperature regulation chart'],
    '[{"title":"Homeostasis explained simply","duration":"4:12","source":"OpenLearn"},{"title":"Feedback loops in physiology","duration":"6:05","source":"Khan Academy"}]'::jsonb,
    '[{"title":"Physiology of homeostasis","source":"NIH","url":"https://www.nih.gov/"},{"title":"Homeostasis overview","source":"Britannica","url":"https://www.britannica.com/"}]'::jsonb,
    array['What is the main purpose of homeostasis?', 'How does the body respond to overheating?', 'Why are feedback loops important?']
  ),
  (
    'neuronal-plasticity', 'Neural plasticity', 'Psychology', 'NOOR-uhl plas-TIS-ih-tee', 'University',
    'The brain’s ability to change and adapt in response to learning, experience, and injury.',
    'Your brain is not fixed. It can strengthen pathways when you practice, learn, or recover from setbacks.',
    'Neural plasticity reflects activity-dependent changes in synaptic strength, cortical reorganization, and network remodeling that support learning and adaptation.',
    array['Supports learning and memory', 'Changes with practice and experience', 'Can also support recovery after injury'],
    'Rehabilitation and repeated skill practice rely on plasticity to improve function after neurological injury.',
    'A student who practices anatomy repeatedly will develop stronger recall and faster recognition over time.',
    'Like carving a path through a forest, repeated use makes the route easier to follow.',
    array['It only happens in childhood.', 'It means the brain is endlessly flexible without limits.'],
    array['Synapse', 'Memory consolidation', 'Neurogenesis', 'Learning'],
    array['Synaptic strengthening diagram', 'Brain pathway map', 'Study habit visualization'],
    '[{"title":"How plasticity shapes learning","duration":"5:40","source":"TED-Ed"},{"title":"Neuroscience basics","duration":"7:30","source":"Crash Course"}]'::jsonb,
    '[{"title":"Brain plasticity overview","source":"APA","url":"https://www.apa.org/"},{"title":"Neural plasticity","source":"NCBI","url":"https://www.ncbi.nlm.nih.gov/"}]'::jsonb,
    array['What does neural plasticity allow the brain to do?', 'How does repetition change brain pathways?', 'Why is plasticity important after injury?']
  ),
  (
    'metabolism', 'Metabolism', 'Biochemistry', 'meh-TAB-uh-liz-um', 'Beginner',
    'The chemical processes that keep cells alive by converting nutrients into usable energy and building blocks.',
    'Metabolism is the body’s way of breaking down food and using it to power cells, grow tissue, and keep things functioning.',
    'Metabolism encompasses catabolic and anabolic pathways that convert substrates into energy and biomolecules through enzyme-catalyzed reactions.',
    array['Includes catabolism and anabolism', 'Enzymes regulate biochemical reactions', 'Provides energy and materials for life'],
    'Disorders in metabolism can affect blood sugar, energy levels, growth, and nutrient processing.',
    'When you eat carbohydrates, your body breaks them down into glucose that cells can use for energy.',
    'Like a factory assembly line, metabolism transforms raw materials into products and energy the body needs.',
    array['It is only about losing weight.', 'It only involves digestion.'],
    array['Catabolism', 'Anabolism', 'ATP', 'Enzyme'],
    array['Cellular respiration diagram', 'ATP cycle infographic', 'Metabolic pathway chart'],
    '[{"title":"Metabolism basics","duration":"3:48","source":"Khan Academy"},{"title":"How cells generate ATP","duration":"8:15","source":"BioInteractive"}]'::jsonb,
    '[{"title":"Metabolic pathways overview","source":"MedlinePlus","url":"https://medlineplus.gov/"},{"title":"Biochemistry of metabolism","source":"OpenStax","url":"https://openstax.org/"}]'::jsonb,
    array['What is the difference between catabolism and anabolism?', 'Why are enzymes important in metabolism?', 'How is energy stored and released in cells?']
  )
on conflict (id) do nothing;

insert into public.courses (id, title, subject, duration, lesson_count, description, sort_order) values
  ('foundations-human-physiology', 'Foundations of Human Physiology', 'Physiology', '6 weeks', 1, 'Understand tissues, circulation, respiration, and homeostatic regulation.', 1),
  ('biological-systems-health', 'Biological Systems in Health', 'Biochemistry', '4 weeks', 0, 'Connect molecular processes with physiological health and disease states.', 2),
  ('clinical-psychology-essentials', 'Clinical Psychology Essentials', 'Psychology', '5 weeks', 0, 'Explore cognition, emotion, stress, and mental health frameworks.', 3)
on conflict (id) do nothing;

insert into public.lessons (
  id, course_id, title, overview, objectives, content, table_of_contents, duration_minutes, sort_order
) values (
  'homeostasis-and-regulation',
  'foundations-human-physiology',
  'Homeostasis and regulation',
  'Homeostasis is the process by which living systems maintain stable internal conditions even when the external environment changes. This lesson introduces feedback loops, thresholds, and physiological balance.',
  array[
    'Learn how negative feedback restores balance.',
    'Identify signs that internal conditions are moving outside the healthy range.',
    'Connect physiology to temperature control, hydration, and metabolism.'
  ],
  'Body systems constantly monitor variables such as temperature, blood pressure, hydration, and glucose. When a variable shifts away from its normal range, sensors detect the change and trigger a response that brings the body back toward balance. This process is called negative feedback.' || E'\n\n' ||
  'For instance, when body temperature rises during exercise, the hypothalamus detects the change and promotes sweating and vasodilation so heat is lost more effectively. When the temperature decreases, the body conserves heat through shivering and reduced blood flow to the skin.',
  array['What is homeostasis?', 'Feedback loops', 'Regulation of temperature', 'Clinical relevance'],
  18,
  1
) on conflict (id) do nothing;

insert into public.resources (id, title, source, type, description, relevance, url, sort_order) values
  ('who-health-topics', 'WHO Health Topics', 'World Health Organization', 'Website', 'Trusted overviews of health systems, disease prevention, and public health guidance.', 'High', 'https://www.who.int/', 1),
  ('openstax-anatomy-physiology', 'OpenStax Anatomy and Physiology', 'OpenStax', 'Textbook', 'Open-access foundational content for anatomy, physiology, and biology topics.', 'High', 'https://openstax.org/', 2),
  ('crash-course-biology', 'Crash Course Biology', 'Crash Course', 'Video', 'Fast, engaging lessons for scientific concepts across biology and health science.', 'Medium', 'https://www.youtube.com/@crashcourse', 3)
on conflict (id) do nothing;

insert into public.quiz_questions (id, question_type, question, options, answer, explanation, sort_order) values
  ('homeostasis-description', 'multiple-choice', 'Which statement best describes homeostasis?',
    array['A stable internal environment maintained by regulation', 'A process that occurs only during exercise', 'A random change in body temperature', 'The study of body tissues'],
    'A stable internal environment maintained by regulation',
    'Homeostasis keeps important variables such as temperature and glucose within a healthy range.', 1),
  ('neural-plasticity-definition', 'true-false', 'Neural plasticity refers to the brain’s ability to change over time.',
    array['True', 'False'], 'True',
    'The brain can adapt through learning, practice, and experience.', 2),
  ('negative-feedback', 'fill-in', 'The body uses ________ feedback to reduce variation and restore balance.',
    array['negative', 'positive', 'random', 'static'], 'negative',
    'Negative feedback opposes the change and helps maintain equilibrium.', 3)
on conflict (id) do nothing;
