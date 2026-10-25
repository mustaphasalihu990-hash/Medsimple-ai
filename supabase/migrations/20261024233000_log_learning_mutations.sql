create function public.log_learning_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  activity_type text;
  target_type text;
  target_id text;
  target_label text;
begin
  if tg_table_name = 'bookmarks' then
    activity_type := 'bookmark';
    target_type := 'term';
    target_id := new.term_id;
    select 'Saved: ' || name into target_label
    from public.terms
    where id = new.term_id;
  elsif tg_table_name = 'lesson_completions' then
    activity_type := 'lesson_complete';
    target_type := 'lesson';
    target_id := new.lesson_id;
    select 'Completed: ' || title into target_label
    from public.lessons
    where id = new.lesson_id;
  elsif tg_table_name = 'quiz_attempts' then
    activity_type := 'quiz_answer';
    target_type := 'quiz_question';
    target_id := new.question_id;
    select 'Answered: ' || question into target_label
    from public.quiz_questions
    where id = new.question_id;
  else
    raise exception 'Unsupported learning activity source: %', tg_table_name;
  end if;

  insert into public.learning_activity (user_id, event_type, target_type, target_id, target_label)
  values (new.user_id, activity_type, target_type, target_id, coalesce(target_label, target_id));
  return new;
end;
$$;

create trigger log_bookmark_activity
  after insert on public.bookmarks
  for each row execute function public.log_learning_mutation();

create trigger log_lesson_completion_activity
  after insert on public.lesson_completions
  for each row execute function public.log_learning_mutation();

create trigger log_quiz_attempt_activity
  after insert on public.quiz_attempts
  for each row execute function public.log_learning_mutation();
