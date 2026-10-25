import { ArrowUpRight } from 'lucide-react'
import { Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getResources, type LearningResource } from '../lib/learningData'

export function ResourcesPage() {
  const [resources, setResources] = useState<LearningResource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  const loadResources = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setResources(await getResources())
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load resources.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadResources()
  }, [loadResources])

  const visibleResources = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return resources.filter((resource) =>
      `${resource.title} ${resource.source} ${resource.type} ${resource.description}`.toLowerCase().includes(normalized),
    )
  }, [resources, query])

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
          <Link to="/courses">Courses</Link>
          <Link to="/videos">Videos</Link>
          <Link to="/materials">Handouts</Link>
          <Link to="/resources" className="active">Resources</Link>
        </nav>
      </aside>

      <main className="main-column">
        <header className="page-topbar">
          <div>
            <p className="eyebrow muted">Learning resources</p>
            <h1>Curated educational materials</h1>
          </div>
        </header>

        <label className="field-group wide-field">
          <Search size={16} aria-hidden="true" />
          <input aria-label="Search resources" placeholder="Search title, source, or description" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        {error && <p className="error-banner" role="alert">{error}</p>}
        {loading && <p role="status">Loading resources…</p>}
        {!loading && !error && visibleResources.length === 0 && <p>{resources.length ? 'No resources match your search.' : 'No resources have been added yet.'}</p>}
        {!loading && !error && <section className="cards-grid resources-grid">
          {visibleResources.map((resource) => (
            <article key={resource.id} className="info-card resource-card">
              <div className="card-top-row">
                <span className="tag">{resource.type}</span>
                <span className="tag subtle">{resource.relevance}</span>
              </div>
              <h3>{resource.title}</h3>
              <p>{resource.description}</p>
              <ul>
                <li>{resource.source}</li>
              </ul>
              <a href={resource.url} target="_blank" rel="noreferrer" className="text-button">
                Open resource <ArrowUpRight size={16} />
              </a>
            </article>
          ))}
        </section>}
      </main>
    </div>
  )
}
