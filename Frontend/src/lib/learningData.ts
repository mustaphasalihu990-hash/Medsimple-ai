import { supabase } from './supabase'

export type Subject = {
  name: string
  icon: string
  color: string
  description: string
  sort_order: number
}

export type Term = {
  id: string
  name: string
  subject: string
  pronunciation: string
  difficulty: 'Beginner' | 'Intermediate' | 'University'
  definition: string
  beginner_explanation: string
  university_explanation: string
  key_points: string[]
  clinical_significance: string
  example: string
  analogy: string
  misconceptions: string[]
  related_terms: string[]
  suggested_visuals: string[]
  videos: { title: string; duration: string; source: string }[]
  resources: { title: string; source: string; url: string }[]
  practice_questions: string[]
}

export type Course = {
  id: string
  title: string
  subject: string
  duration: string
  lesson_count: number
  description: string
  sort_order: number
  progress: number
}

export type LearningResource = {
  id: string
  title: string
  source: string
  type: string
  description: string
  relevance: string
  url: string
  sort_order: number
}

export type TutorialVideo = {
  id: string
  title: string
  description: string
  learning_objectives: string[]
  subject: string
  course_id: string | null
  topic: string
  academic_level: 'Beginner' | 'Intermediate' | 'University'
  provider: string
  provider_video_id: string | null
  url: string
  duration_seconds: number | null
  sort_order: number
  position_seconds: number
}

export type LearningMaterial = {
  id: string
  title: string
  description: string
  subject: string
  course_id: string | null
  topic: string
  academic_level: 'Beginner' | 'Intermediate' | 'University'
  mime_type: string
  file_name: string
  storage_path: string | null
  external_url: string | null
  file_size_bytes: number | null
  sort_order: number
}

export type StudyGoal = {
  id: string
  title: string
  description: string
  target_date: string | null
  completed_at: string | null
  created_at: string
}

export type DueFlashcard = {
  term: Term
  interval_days: number
  repetitions: number
  ease_factor: number
}

export type QuizQuestion = {
  id: string
  question_type: string
  question: string
  options: string[]
  answer: string
  explanation: string
  sort_order: number
  subject: string
  topic: string
  academic_level: 'Beginner' | 'Intermediate' | 'University'
  source_type: 'practice' | 'past_exam'
  exam_year: number | null
  source_label: string | null
}

export type Lesson = {
  id: string
  course_id: string
  title: string
  overview: string
  objectives: string[]
  content: string
  table_of_contents: string[]
  duration_minutes: number
  sort_order: number
}

export type LearningActivity = {
  id: string
  event_type: 'term_view' | 'bookmark' | 'lesson_complete' | 'quiz_answer' | 'flashcard_review' | 'study_goal_created' | 'study_goal_completed'
  target_type: string
  target_id: string
  target_label: string
  created_at: string
}

export type UserPreferences = {
  full_name: string
  preferred_level: 'Beginner' | 'Intermediate' | 'University'
  theme: 'light' | 'dark'
}

export type DashboardData = {
  courses: Course[]
  recentTerms: Pick<Term, 'id' | 'name' | 'subject'>[]
  activities: LearningActivity[]
  recentQuizAttempts: { id: string; question: string; is_correct: boolean; created_at: string }[]
  termsReviewed: number
  quizAccuracy: number | null
  studyStreak: number
  savedTopics: number
  videoCount: number
  materialCount: number
  practiceQuestionCount: number
  pastExamQuestionCount: number
  dueFlashcardCount: number
  openGoalCount: number
}

async function queryRows<T>(query: PromiseLike<{ data: T[] | null; error: Error | null }>): Promise<T[]> {
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

async function queryCount(query: PromiseLike<{ count: number | null; error: Error | null }>): Promise<number> {
  const { count, error } = await query
  if (error) throw error
  return count ?? 0
}

export async function getSubjects(): Promise<Subject[]> {
  return queryRows(
    supabase.from('subjects').select('*').order('sort_order').returns<Subject[]>(),
  )
}

export async function getTerms(): Promise<Term[]> {
  return queryRows(
    supabase.from('terms').select('*').order('name').returns<Term[]>(),
  )
}

export async function getTerm(termId: string): Promise<Term | null> {
  const { data, error } = await supabase
    .from('terms')
    .select('*')
    .eq('id', termId)
    .maybeSingle<Term>()
  if (error) throw error
  return data
}

export async function getCourses(userId?: string): Promise<Course[]> {
  const courses = await queryRows(
    supabase.from('courses').select('*').order('sort_order').returns<Omit<Course, 'progress'>[]>(),
  )
  if (!userId) return courses.map((course) => ({ ...course, progress: 0 }))

  const progressRows = await queryRows(
    supabase
      .from('course_progress')
      .select('course_id, progress_percent')
      .eq('user_id', userId)
      .returns<{ course_id: string; progress_percent: number }[]>(),
  )
  const progressByCourse = new Map(progressRows.map((row) => [row.course_id, row.progress_percent]))
  return courses.map((course) => ({ ...course, progress: progressByCourse.get(course.id) ?? 0 }))
}

export async function getResources(): Promise<LearningResource[]> {
  return queryRows(
    supabase.from('resources').select('*').order('sort_order').returns<LearningResource[]>(),
  )
}

export async function getTutorialVideos(userId: string): Promise<TutorialVideo[]> {
  const [videos, progress] = await Promise.all([
    queryRows(supabase.from('tutorial_videos').select('*').order('sort_order').returns<Omit<TutorialVideo, 'position_seconds'>[]>()),
    queryRows(
      supabase.from('video_progress').select('video_id, position_seconds')
        .eq('user_id', userId).returns<{ video_id: string; position_seconds: number }[]>(),
    ),
  ])
  const positions = new Map(progress.map(({ video_id, position_seconds }) => [video_id, position_seconds]))
  return videos.map((video) => ({ ...video, position_seconds: positions.get(video.id) ?? 0 }))
}

export async function saveVideoPosition(userId: string, videoId: string, positionSeconds: number) {
  const { error } = await supabase.from('video_progress').upsert(
    {
      user_id: userId,
      video_id: videoId,
      position_seconds: Math.max(0, Math.floor(positionSeconds)),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,video_id' },
  )
  if (error) throw error
}

export async function getLearningMaterials(): Promise<LearningMaterial[]> {
  return queryRows(
    supabase.from('learning_materials').select('*').order('sort_order').returns<LearningMaterial[]>(),
  )
}

export async function downloadLearningMaterial(material: LearningMaterial): Promise<Blob> {
  if (material.storage_path) {
    const { data, error } = await supabase.storage.from('learning-materials').download(material.storage_path)
    if (error) throw error
    return data
  }
  if (!material.external_url) throw new Error('This learning material has no downloadable file.')

  const response = await fetch(material.external_url)
  if (!response.ok) throw new Error(`Download failed with HTTP ${response.status}.`)
  return response.blob()
}

export async function getQuizQuestions(): Promise<QuizQuestion[]> {
  return queryRows(
    supabase.from('quiz_questions').select('*').order('sort_order').returns<QuizQuestion[]>(),
  )
}

export async function getStudyGoals(userId: string): Promise<StudyGoal[]> {
  return queryRows(
    supabase.from('study_goals').select('*').eq('user_id', userId)
      .order('completed_at', { ascending: true, nullsFirst: true })
      .order('created_at', { ascending: false })
      .returns<StudyGoal[]>(),
  )
}

export async function createStudyGoal(userId: string, title: string, description: string, targetDate: string) {
  const { error } = await supabase.from('study_goals').insert({
    user_id: userId,
    title: title.trim(),
    description: description.trim(),
    target_date: targetDate || null,
  })
  if (error) throw error
}

export async function setStudyGoalCompleted(userId: string, goalId: string, completed: boolean) {
  const { error } = await supabase.from('study_goals')
    .update({ completed_at: completed ? new Date().toISOString() : null })
    .eq('user_id', userId)
    .eq('id', goalId)
  if (error) throw error
}

export async function deleteStudyGoal(userId: string, goalId: string) {
  const { error } = await supabase.from('study_goals').delete().eq('user_id', userId).eq('id', goalId)
  if (error) throw error
}

export async function getDueFlashcards(userId: string): Promise<DueFlashcard[]> {
  const [terms, reviews] = await Promise.all([
    getTerms(),
    queryRows(
      supabase.from('flashcard_reviews').select('term_id, interval_days, repetitions, ease_factor, due_at')
        .eq('user_id', userId).returns<{
          term_id: string
          interval_days: number
          repetitions: number
          ease_factor: number
          due_at: string
        }[]>(),
    ),
  ])
  const now = Date.now()
  const reviewsByTerm = new Map(reviews.map((review) => [review.term_id, review]))
  return terms
    .filter((term) => {
      const review = reviewsByTerm.get(term.id)
      return !review || Date.parse(review.due_at) <= now
    })
    .map((term) => {
      const review = reviewsByTerm.get(term.id)
      return {
        term,
        interval_days: review?.interval_days ?? 0,
        repetitions: review?.repetitions ?? 0,
        ease_factor: review?.ease_factor ?? 2.5,
      }
    })
}

export async function saveFlashcardReview(userId: string, card: DueFlashcard, rating: 'again' | 'hard' | 'good' | 'easy') {
  const quality = { again: 0, hard: 3, good: 4, easy: 5 }[rating]
  const easeFactor = Math.max(
    1.3,
    card.ease_factor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02),
  )
  const repetitions = rating === 'again' ? 0 : card.repetitions + 1
  const intervalDays = rating === 'again'
    ? 0
    : rating === 'hard'
      ? Math.max(1, Math.ceil(card.interval_days * 1.2))
      : rating === 'easy'
        ? Math.max(4, Math.ceil(Math.max(card.interval_days, 1) * easeFactor * 1.3))
        : repetitions === 1 ? 1 : repetitions === 2 ? 3 : Math.ceil(Math.max(card.interval_days, 1) * easeFactor)
  const dueAt = new Date(Date.now() + (rating === 'again' ? 10 * 60 * 1000 : intervalDays * 24 * 60 * 60 * 1000))

  const { error } = await supabase.from('flashcard_reviews').upsert(
    {
      user_id: userId,
      term_id: card.term.id,
      due_at: dueAt.toISOString(),
      interval_days: intervalDays,
      repetitions,
      ease_factor: Number(easeFactor.toFixed(2)),
      last_reviewed_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,term_id' },
  )
  if (error) throw error
}

export async function getLesson(lessonId: string): Promise<Lesson | null> {
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('id', lessonId)
    .maybeSingle<Lesson>()
  if (error) throw error
  return data
}

export async function getCourseLessons(courseId: string): Promise<Lesson[]> {
  return queryRows(
    supabase.from('lessons').select('*').eq('course_id', courseId).order('sort_order').returns<Lesson[]>(),
  )
}

export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, preferred_level, theme')
    .eq('id', userId)
    .maybeSingle<UserPreferences>()
  if (error) throw error
  return data
}

export async function saveUserPreferences(userId: string, preferences: UserPreferences) {
  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    ...preferences,
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}

export async function getLessonCompletion(userId: string, lessonId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('lesson_completions')
    .select('lesson_id')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .maybeSingle<{ lesson_id: string }>()
  if (error) throw error
  return Boolean(data)
}

export async function getBookmarkedTermIds(userId: string): Promise<string[]> {
  const rows = await queryRows(
    supabase.from('bookmarks').select('term_id').eq('user_id', userId).returns<{ term_id: string }[]>(),
  )
  return rows.map(({ term_id }) => term_id)
}

export async function setTermBookmark(userId: string, term: Pick<Term, 'id' | 'name'>, bookmarked: boolean) {
  if (bookmarked) {
    const { error } = await supabase.from('bookmarks').delete().eq('user_id', userId).eq('term_id', term.id)
    if (error) throw error
    return
  }

  const { error } = await supabase.from('bookmarks').insert({ user_id: userId, term_id: term.id })
  if (error) throw error
}

export async function recordActivity(
  userId: string,
  eventType: LearningActivity['event_type'],
  targetType: string,
  targetId: string,
  targetLabel: string,
) {
  const { error } = await supabase.from('learning_activity').insert({
    user_id: userId,
    event_type: eventType,
    target_type: targetType,
    target_id: targetId,
    target_label: targetLabel,
  })
  if (error) throw error
}

export async function saveQuizAttempt(
  userId: string,
  question: QuizQuestion,
  selectedAnswer: string,
  isCorrect: boolean,
) {
  const { error } = await supabase.from('quiz_attempts').insert({
    user_id: userId,
    question_id: question.id,
    selected_answer: selectedAnswer,
    is_correct: isCorrect,
  })
  if (error) throw error
}

export async function completeLesson(userId: string, lesson: Lesson, course: Course) {
  const { error: completionError } = await supabase.from('lesson_completions').insert({
    user_id: userId,
    lesson_id: lesson.id,
  })
  if (completionError) throw completionError

  const { count, error: countError } = await supabase
    .from('lesson_completions')
    .select('lesson_id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in(
      'lesson_id',
      await getCourseLessonIds(course.id),
    )
  if (countError) throw countError

  const progress = Math.min(100, Math.round(((count ?? 0) / Math.max(course.lesson_count, 1)) * 100))
  const { error: progressError } = await supabase.from('course_progress').upsert(
    { user_id: userId, course_id: course.id, progress_percent: progress },
    { onConflict: 'user_id,course_id' },
  )
  if (progressError) throw progressError
}

async function getCourseLessonIds(courseId: string): Promise<string[]> {
  const rows = await queryRows(
    supabase.from('lessons').select('id').eq('course_id', courseId).returns<{ id: string }[]>(),
  )
  return rows.map(({ id }) => id)
}

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const [
    courses,
    activities,
    quizAttempts,
    bookmarks,
    videoCount,
    materialCount,
    practiceQuestionCount,
    pastExamQuestionCount,
    dueFlashcards,
    openGoalCount,
  ] = await Promise.all([
    getCourses(userId),
    queryRows(
      supabase
        .from('learning_activity')
        .select('id, event_type, target_type, target_id, target_label, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .returns<LearningActivity[]>(),
    ),
    queryRows(
      supabase
        .from('quiz_attempts')
        .select('id, question_id, is_correct, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .returns<{ id: string; question_id: string; is_correct: boolean; created_at: string }[]>(),
    ),
    queryRows(
      supabase.from('bookmarks').select('term_id').eq('user_id', userId).returns<{ term_id: string }[]>(),
    ),
    queryCount(supabase.from('tutorial_videos').select('*', { count: 'exact', head: true })),
    queryCount(supabase.from('learning_materials').select('*', { count: 'exact', head: true })),
    queryCount(supabase.from('quiz_questions').select('*', { count: 'exact', head: true }).eq('source_type', 'practice')),
    queryCount(supabase.from('quiz_questions').select('*', { count: 'exact', head: true }).eq('source_type', 'past_exam')),
    getDueFlashcards(userId),
    queryCount(supabase.from('study_goals').select('*', { count: 'exact', head: true }).eq('user_id', userId).is('completed_at', null)),
  ])

  const viewedTermIds = [...new Set(
    activities.filter((activity) => activity.event_type === 'term_view').map((activity) => activity.target_id),
  )]
  let recentTerms: DashboardData['recentTerms'] = []
  if (viewedTermIds.length > 0) {
    const terms = await queryRows(
      supabase.from('terms').select('id, name, subject').in('id', viewedTermIds).returns<DashboardData['recentTerms']>(),
    )
    const termsById = new Map(terms.map((term) => [term.id, term]))
    recentTerms = viewedTermIds.map((id) => termsById.get(id)).filter((term): term is NonNullable<typeof term> => Boolean(term))
  }

  const studyDays = new Set(
    activities.map((activity) => new Date(activity.created_at).toISOString().slice(0, 10)),
  )
  let studyStreak = 0
  const date = new Date()
  date.setUTCHours(0, 0, 0, 0)
  if (!studyDays.has(date.toISOString().slice(0, 10))) date.setUTCDate(date.getUTCDate() - 1)
  while (studyDays.has(date.toISOString().slice(0, 10))) {
    studyStreak += 1
    date.setUTCDate(date.getUTCDate() - 1)
  }

  const correctAnswers = quizAttempts.filter((attempt) => attempt.is_correct).length
  const recentQuestionIds = [...new Set(quizAttempts.slice(0, 2).map((attempt) => attempt.question_id))]
  const recentQuestions = recentQuestionIds.length
    ? await queryRows(
      supabase
        .from('quiz_questions')
        .select('id, question')
        .in('id', recentQuestionIds)
        .returns<{ id: string; question: string }[]>(),
    )
    : []
  const questionById = new Map(recentQuestions.map((question) => [question.id, question.question]))
  return {
    courses,
    recentTerms,
    activities: activities.slice(0, 5),
    recentQuizAttempts: quizAttempts.slice(0, 2).map((attempt) => ({
      id: attempt.id,
      question: questionById.get(attempt.question_id) ?? 'Quiz question',
      is_correct: attempt.is_correct,
      created_at: attempt.created_at,
    })),
    termsReviewed: viewedTermIds.length,
    quizAccuracy: quizAttempts.length ? Math.round((correctAnswers / quizAttempts.length) * 100) : null,
    studyStreak,
    savedTopics: bookmarks.length,
    videoCount,
    materialCount,
    practiceQuestionCount,
    pastExamQuestionCount,
    dueFlashcardCount: dueFlashcards.length,
    openGoalCount,
  }
}
