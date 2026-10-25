import { ArrowRight, Clock3, Search, Star } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getCourses, type Course } from '../lib/learningData'

export function CoursesPage() {
  const { session } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('All')
  const [sortBy, setSortBy] = useState('title')

  const loadCourses = useCallback(async () => {
    if (!session?.user.id) return
    setLoading(true)
    setError('')
    try {
      setCourses(await getCourses(session.user.id))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load courses.')
    } finally {
      setLoading(false)
    }
  }, [session?.user.id])

  useEffect(() => {
    void loadCourses()
  }, [loadCourses])

  const subjects = useMemo(
    () => [...new Set(courses.map((course) => course.subject))].sort((a, b) => a.localeCompare(b)),
    [courses],
  )

  const visibleCourses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const filteredCourses = courses.filter((course) => {
      const matchesQuery =
        !normalizedQuery ||
        course.title.toLowerCase().includes(normalizedQuery) ||
        course.subject.toLowerCase().includes(normalizedQuery) ||
        course.description.toLowerCase().includes(normalizedQuery)
      const matchesSubject = selectedSubject === 'All' || course.subject === selectedSubject

      return matchesQuery && matchesSubject
    })

    return filteredCourses.sort((first, second) => {
      switch (sortBy) {
        case 'progress-desc':
          return second.progress - first.progress
        case 'progress-asc':
          return first.progress - second.progress
        case 'duration-asc':
          return Number.parseInt(first.duration, 10) - Number.parseInt(second.duration, 10)
        case 'title':
        default:
          return first.title.localeCompare(second.title)
      }
    })
  }, [courses, query, selectedSubject, sortBy])

  return (
    <div className="app-shell dashboard-shell">
      <aside className="left-sidebar">
        <div className="brand-block">
          <div className="brand-mark">M</div>
          <span>MedEase AI</span>
        </div>
        <nav className="sidebar-nav">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/explorer">Explorer</Link>
          <Link to="/courses" className="active">Courses</Link>
          <Link to="/tutor">AI tutor</Link>
          <Link to="/resources">Resources</Link>
        </nav>
      </aside>

      <main className="main-column">
        <header className="page-topbar">
          <div>
            <p className="eyebrow muted">Courses & lessons</p>
            <h1>Study pathways for modern learners</h1>
          </div>
        </header>

        <section className="course-controls" aria-label="Filter and sort courses">
          <label className="field-group wide-field">
            <Search size={16} aria-hidden="true" />
            <input
              aria-label="Search courses"
              placeholder="Search courses"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="field-group course-select">
            <span>Subject</span>
            <select
              aria-label="Filter courses by subject"
              value={selectedSubject}
              onChange={(event) => setSelectedSubject(event.target.value)}
            >
              <option value="All">All subjects</option>
              {subjects.map((subject) => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </label>
          <label className="field-group course-select">
            <span>Sort by</span>
            <select aria-label="Sort courses" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="title">Title: A to Z</option>
              <option value="progress-desc">Progress: highest first</option>
              <option value="progress-asc">Progress: lowest first</option>
              <option value="duration-asc">Duration: shortest first</option>
            </select>
          </label>
        </section>

        {error && <p className="error-banner" role="alert">{error}</p>}
        {loading && <p role="status">Loading courses…</p>}
        {!loading && !error && <p className="course-result-count" aria-live="polite">
          {visibleCourses.length} {visibleCourses.length === 1 ? 'course' : 'courses'}
        </p>}

        {!loading && !error && (
          visibleCourses.length > 0 ? (
            <section className="cards-grid courses-grid" aria-label="Courses">
              {visibleCourses.map((course) => (
                <article key={course.id} className="info-card resource-card">
                  <div className="card-top-row">
                    <span className="tag">{course.subject}</span>
                    <span className="tag subtle">{course.duration}</span>
                  </div>
                  <h3>{course.title}</h3>
                  <p>{course.description}</p>

                  <div className="meta-row">
                    <span><Clock3 size={14} /> {course.lesson_count} lessons</span>
                    <span><Star size={14} /> {course.progress}%</span>
                  </div>

                  <div className="progress-bar">
                    <span style={{ width: `${course.progress}%` }} />
                  </div>

                  {course.lesson_count > 0 ? (
                    <Link to={`/courses/lesson?course=${encodeURIComponent(course.id)}`} className="text-button">
                      {course.progress ? 'Continue learning' : 'Start learning'} <ArrowRight size={16} />
                    </Link>
                  ) : <p className="text-button">Lessons not published yet</p>}
                </article>
              ))}
            </section>
          ) : (
            <p className="course-empty-state">No courses match your search. Try another term or subject.</p>
          )
        )}
      </main>
    </div>
  )
}
