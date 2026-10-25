import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { completeLesson, getCourseLessons, getCourses, getLessonCompletion, type Course, type Lesson } from '../lib/learningData'

const defaultCourseId = 'foundations-human-physiology'

export function LessonPage() {
  const { session } = useAuth()
  const [searchParams] = useSearchParams()
  const courseId = searchParams.get('course') ?? defaultCourseId
  const [course, setCourse] = useState<Course | null>(null)
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [completed, setCompleted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadLesson = useCallback(async () => {
    if (!session?.user.id) return
    setLoading(true)
    setError('')
    try {
      const courses = await getCourses(session.user.id)
      const nextCourse = courses.find((item) => item.id === courseId) ?? null
      setCourse(nextCourse)
      if (!nextCourse) {
        setLesson(null)
        return
      }
      const lessons = await getCourseLessons(nextCourse.id)
      const nextLesson = lessons[0] ?? null
      setLesson(nextLesson)
      setCompleted(nextLesson ? await getLessonCompletion(session.user.id, nextLesson.id) : false)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load this lesson.')
    } finally {
      setLoading(false)
    }
  }, [session?.user.id, courseId])

  useEffect(() => {
    void loadLesson()
  }, [loadLesson])

  async function markComplete() {
    if (!session?.user.id || !course || !lesson) return
    setSaving(true)
    setError('')
    try {
      await completeLesson(session.user.id, lesson, course)
      setCompleted(true)
      const updatedCourses = await getCourses(session.user.id)
      setCourse(updatedCourses.find((item) => item.id === course.id) ?? course)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save lesson completion.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="app-shell dashboard-shell">
      <aside className="left-sidebar">
        <div className="brand-block"><div className="brand-mark">M</div><span>MedEase AI</span></div>
        <nav className="sidebar-nav">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/explorer">Explorer</Link>
          <Link to="/courses" className="active">Course lesson</Link>
        </nav>
      </aside>

      <main className="main-column">
        {loading && <p role="status">Loading lesson…</p>}
        {error && <p className="error-banner" role="alert">{error}</p>}
        {!loading && !error && (!course || !lesson) && (
          <section className="panel-card">
            <h1>No lesson published yet</h1>
            <p>This course does not have lesson content in Supabase yet.</p>
            <Link to="/courses" className="primary-button">Back to courses</Link>
          </section>
        )}
        {!loading && course && lesson && (
          <>
            <header className="page-topbar">
              <div>
                <p className="eyebrow muted">{course.title}</p>
                <h1>{lesson.title}</h1>
              </div>
              <button type="button" className="primary-button small-button" onClick={() => void markComplete()} disabled={saving || completed}>
                <CheckCircle2 size={16} /> {saving ? 'Saving…' : completed ? 'Completed' : 'Mark complete'}
              </button>
            </header>

            <section className="term-showcase" style={{ gridTemplateColumns: '1fr 320px' }}>
              <article className="showcase-copy">
                <p className="eyebrow muted">Lesson overview · {lesson.duration_minutes} minutes</p>
                <p>{lesson.overview}</p>
                <ul className="check-list">
                  {lesson.objectives.map((objective) => <li key={objective}>{objective}</li>)}
                </ul>
                <p>{course.progress}% course progress</p>
                <div className="progress-bar large"><span style={{ width: `${course.progress}%` }} /></div>
              </article>

              <aside className="panel-card">
                <h3>Table of contents</h3>
                <ul className="bullet-list">
                  {lesson.table_of_contents.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </aside>
            </section>

            <section className="panel-card">
              <h2>Lesson content</h2>
              {lesson.content.split('\n\n').map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </section>

            <div className="composer-actions">
              <Link to="/courses" className="secondary-button small-button"><ArrowLeft size={14} /> All courses</Link>
              <Link to="/quiz" className="primary-button small-button">Practice questions <ArrowRight size={14} /></Link>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
