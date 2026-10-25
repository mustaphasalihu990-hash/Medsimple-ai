update public.courses
set lesson_count = case id
  when 'foundations-human-physiology' then 1
  when 'biological-systems-health' then 0
  when 'clinical-psychology-essentials' then 0
  else lesson_count
end
where id in (
  'foundations-human-physiology',
  'biological-systems-health',
  'clinical-psychology-essentials'
);
