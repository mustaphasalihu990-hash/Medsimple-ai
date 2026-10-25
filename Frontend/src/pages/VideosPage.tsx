import { ArrowUpRight, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getCourses, getTutorialVideos, saveVideoPosition, type Course, type TutorialVideo } from '../lib/learningData'

export function VideosPage() {
  const { session } = useAuth()
  const [videos, setVideos] = useState<TutorialVideo[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [query, setQuery] = useState('')
  const [subject, setSubject] = useState('All')
  const [courseId, setCourseId] = useState('All')
  const [level, setLevel] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const lastSavedAt = useRef(new Map<string, number>())

  const loadVideos = useCallback(async () => {
    if (!session?.user.id) return
    setLoading(true)
    setError('')
    try {
      const [nextVideos, nextCourses] = await Promise.all([
        getTutorialVideos(session.user.id),
        getCourses(session.user.id),
      ])
      setVideos(nextVideos)
      setCourses(nextCourses)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load tutorial videos.')
    } finally {
      setLoading(false)
    }
  }, [session?.user.id])

  useEffect(() => {
    void loadVideos()
  }, [loadVideos])

  const subjects = useMemo(() => [...new Set(videos.map((video) => video.subject))].sort(), [videos])
  const visibleVideos = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return videos.filter((video) => {
      const searchText = `${video.title} ${video.description} ${video.subject} ${video.topic} ${video.provider}`.toLowerCase()
      return (!normalizedQuery || searchText.includes(normalizedQuery))
        && (subject === 'All' || subject === video.subject)
        && (courseId === 'All' || courseId === video.course_id)
        && (level === 'All' || level === video.academic_level)
    })
  }, [videos, query, subject, courseId, level])

  async function persistPosition(video: TutorialVideo, seconds: number) {
    if (!session?.user.id) return
    lastSavedAt.current.set(video.id, seconds)
    try {
      await saveVideoPosition(session.user.id, video.id, seconds)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save video progress.')
    }
  }

  return (
    <div className="app-shell dashboard-shell">
      <aside className="left-sidebar">
        <div className="brand-block"><div className="brand-mark">M</div><span>MedSimple AI</span></div>
        <nav className="sidebar-nav">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/videos" className="active">Tutorial videos</Link>
          <Link to="/materials">Handouts</Link>
          <Link to="/quiz">Practice questions</Link>
          <Link to="/guidance">Academic guidance</Link>
          <Link to="/study-skills">Study skills</Link>
        </nav>
      </aside>
      <main className="main-column">
        <header className="page-topbar">
          <div><p className="eyebrow muted">Video library</p><h1>Tutorial videos</h1></div>
        </header>
        <section className="course-controls" aria-label="Search and filter videos">
          <label className="field-group wide-field">
            <Search size={16} aria-hidden="true" />
            <input aria-label="Search tutorial videos" placeholder="Search title, topic, or subject" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <label className="field-group course-select">
            <span>Subject</span>
            <select value={subject} onChange={(event) => setSubject(event.target.value)}>
              <option>All</option>
              {subjects.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="field-group course-select">
            <span>Academic level</span>
            <select value={level} onChange={(event) => setLevel(event.target.value)}>
              <option>All</option>
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>University</option>
            </select>
          </label>
          <label className="field-group course-select">
            <span>Course</span>
            <select value={courseId} onChange={(event) => setCourseId(event.target.value)}>
              <option value="All">All courses</option>
              {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
            </select>
          </label>
        </section>
        {error && <p className="error-banner" role="alert">{error}</p>}
        {loading && <p role="status">Loading videos…</p>}
        {!loading && !error && visibleVideos.length === 0 && (
          <div className="empty-panel">
            <h2>{videos.length ? 'No videos match those filters.' : 'No tutorial videos have been published yet.'}</h2>
            <p>Videos will appear here after an educator adds a verified provider link, subject, topic, and learning objectives.</p>
          </div>
        )}
        {!loading && !error && visibleVideos.length > 0 && (
          <section className="cards-grid resources-grid" aria-label="Tutorial videos">
            {visibleVideos.map((video) => (
              <article key={video.id} className="info-card resource-card">
                {video.provider.toLowerCase() === 'html5' && (
                  <video
                    controls
                    preload="metadata"
                    src={video.url}
                    onLoadedMetadata={(event) => {
                      const player = event.currentTarget
                      if (video.position_seconds > 0 && video.position_seconds < player.duration) {
                        player.currentTime = video.position_seconds
                      }
                    }}
                    onTimeUpdate={(event) => {
                      const seconds = Math.floor(event.currentTarget.currentTime)
                      if (seconds - (lastSavedAt.current.get(video.id) ?? 0) >= 15) {
                        void persistPosition(video, seconds)
                      }
                    }}
                    onPause={(event) => void persistPosition(video, event.currentTarget.currentTime)}
                    onEnded={() => void persistPosition(video, 0)}
                  />
                )}
                <div className="card-top-row">
                  <span className="tag">{video.subject}</span>
                  <span className="tag subtle">{video.academic_level}</span>
                </div>
                <h2>{video.title}</h2>
                <p>{video.description}</p>
                <p className="info-label">{video.topic || 'General topic'} · {video.provider}</p>
                {video.learning_objectives.length > 0 && (
                  <ul>{video.learning_objectives.map((objective) => <li key={objective}>{objective}</li>)}</ul>
                )}
                {video.provider.toLowerCase() !== 'html5' && (
                  <a className="text-button" href={video.url} target="_blank" rel="noreferrer">
                    Open video <ArrowUpRight size={16} />
                  </a>
                )}
                {video.provider.toLowerCase() === 'html5' && video.position_seconds > 0 && (
                  <small>Resume position: {Math.floor(video.position_seconds / 60)}:{String(video.position_seconds % 60).padStart(2, '0')}</small>
                )}
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  )
}
