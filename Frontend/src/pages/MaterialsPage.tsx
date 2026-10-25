import { ArrowDownToLine, ExternalLink, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getCourses, getLearningMaterials, downloadLearningMaterial, type Course, type LearningMaterial } from '../lib/learningData'

export function MaterialsPage() {
  const { session } = useAuth()
  const [materials, setMaterials] = useState<LearningMaterial[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [query, setQuery] = useState('')
  const [subject, setSubject] = useState('All')
  const [courseId, setCourseId] = useState('All')
  const [level, setLevel] = useState('All')
  const [preview, setPreview] = useState<{ id: string; url: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState('')
  const [error, setError] = useState('')

  const loadMaterials = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [nextMaterials, nextCourses] = await Promise.all([
        getLearningMaterials(),
        getCourses(session?.user.id),
      ])
      setMaterials(nextMaterials)
      setCourses(nextCourses)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load learning materials.')
    } finally {
      setLoading(false)
    }
  }, [session?.user.id])

  useEffect(() => {
    void loadMaterials()
  }, [loadMaterials])

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url)
    }
  }, [preview])

  const subjects = useMemo(() => [...new Set(materials.map((item) => item.subject))].sort(), [materials])
  const visibleMaterials = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return materials.filter((item) => {
      const searchText = `${item.title} ${item.description} ${item.subject} ${item.topic} ${item.file_name}`.toLowerCase()
      return (!normalizedQuery || searchText.includes(normalizedQuery))
        && (subject === 'All' || subject === item.subject)
        && (courseId === 'All' || courseId === item.course_id)
        && (level === 'All' || level === item.academic_level)
    })
  }, [materials, query, subject, courseId, level])

  async function handleDownload(material: LearningMaterial, showPreview = false) {
    setDownloadingId(material.id)
    setError('')
    try {
      const blob = await downloadLearningMaterial(material)
      if (showPreview && material.mime_type === 'application/pdf') {
        setPreview({ id: material.id, url: URL.createObjectURL(blob) })
        return
      }
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = material.file_name
      document.body.append(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Unable to download this material.')
    } finally {
      setDownloadingId('')
    }
  }

  return (
    <div className="app-shell dashboard-shell">
      <aside className="left-sidebar">
        <div className="brand-block"><div className="brand-mark">M</div><span>MedSimple AI</span></div>
        <nav className="sidebar-nav">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/videos">Tutorial videos</Link>
          <Link to="/materials" className="active">Handouts</Link>
          <Link to="/quiz">Practice questions</Link>
          <Link to="/guidance">Academic guidance</Link>
          <Link to="/study-skills">Study skills</Link>
        </nav>
      </aside>
      <main className="main-column">
        <header className="page-topbar">
          <div><p className="eyebrow muted">Downloadable learning materials</p><h1>Handouts and study notes</h1></div>
        </header>
        <section className="course-controls" aria-label="Search and filter materials">
          <label className="field-group wide-field">
            <Search size={16} aria-hidden="true" />
            <input aria-label="Search materials" placeholder="Search title, topic, or subject" value={query} onChange={(event) => setQuery(event.target.value)} />
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
        {loading && <p role="status">Loading materials…</p>}
        {!loading && !error && visibleMaterials.length === 0 && (
          <div className="empty-panel">
            <h2>{materials.length ? 'No materials match those filters.' : 'No handouts have been published yet.'}</h2>
            <p>Materials uploaded to the private Supabase learning-materials bucket will appear here. PDFs can be previewed in the browser.</p>
          </div>
        )}
        {!loading && !error && visibleMaterials.length > 0 && (
          <section className="cards-grid resources-grid" aria-label="Learning materials">
            {visibleMaterials.map((material) => (
              <article key={material.id} className="info-card resource-card">
                <div className="card-top-row">
                  <span className="tag">{material.subject}</span>
                  <span className="tag subtle">{material.academic_level}</span>
                </div>
                <h2>{material.title}</h2>
                <p>{material.description}</p>
                <p className="info-label">{material.topic || 'General topic'} · {material.file_name}</p>
                {material.file_size_bytes !== null && <small>{(material.file_size_bytes / (1024 * 1024)).toFixed(1)} MB</small>}
                {material.storage_path ? (
                  <div className="resource-actions">
                    {material.mime_type === 'application/pdf' && (
                      <button type="button" className="secondary-button small-button" onClick={() => void handleDownload(material, true)} disabled={downloadingId === material.id}>
                        Preview PDF
                      </button>
                    )}
                    <button type="button" className="text-button" onClick={() => void handleDownload(material)} disabled={downloadingId === material.id}>
                      <ArrowDownToLine size={16} /> {downloadingId === material.id ? 'Loading…' : 'Download'}
                    </button>
                  </div>
                ) : material.external_url && (
                  <a className="text-button" href={material.external_url} target="_blank" rel="noreferrer">
                    Open material <ExternalLink size={16} />
                  </a>
                )}
                {preview?.id === material.id && (
                  <iframe className="pdf-preview" title={`Preview: ${material.title}`} src={preview.url} />
                )}
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  )
}
