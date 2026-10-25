begin;

update public.terms
set subject = 'Physiology'
where subject = 'Psychology';

update public.courses
set subject = 'Physiology'
where subject = 'Psychology';

update public.courses
set title = 'Neural Plasticity and Learning',
    description = 'Explore neural adaptation, learning, memory, and recovery.'
where id = 'clinical-psychology-essentials';

update public.quiz_questions
set subject = 'Physiology'
where subject = 'Psychology';

update public.tutorial_videos
set subject = 'Physiology'
where subject = 'Psychology';

update public.learning_materials
set subject = 'Physiology'
where subject = 'Psychology';

delete from public.subjects
where name = 'Psychology';

commit;
