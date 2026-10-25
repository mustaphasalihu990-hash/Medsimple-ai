import { BookOpenCheck, Eraser, Search, SlidersHorizontal } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getSubjects, getTerms, type Subject, type Term } from '../lib/learningData'

export function ExplorerPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [terms, setTerms] = useState<Term[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [selectedSubject, setSelectedSubject] = useState('All')
  const [difficulty, setDifficulty] = useState('All')

  const loadCatalog = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [nextTerms, nextSubjects] = await Promise.all([getTerms(), getSubjects()])
      setTerms(nextTerms)
      setSubjects(nextSubjects)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load the learning catalog.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCatalog()
  }, [loadCatalog])

  const filteredTerms = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return terms.filter((term) => {
      const searchText = `${term.name} ${term.subject} ${term.definition} ${term.beginner_explanation} ${term.related_terms.join(' ')}`.toLowerCase()
      const matchesQuery = !normalizedQuery || searchText.includes(normalizedQuery)
      const matchesSubject = selectedSubject === 'All' || term.subject === selectedSubject
      const matchesDifficulty = difficulty === 'All' || term.difficulty === difficulty
      return matchesQuery && matchesSubject && matchesDifficulty
    })
  }, [terms, query, selectedSubject, difficulty])

  return (
    <div className="app-shell dashboard-shell">
      <aside className="left-sidebar">
        <div className="brand-block">
          <div className="brand-mark">M</div>
          <span>MedEase AI</span>
        </div>

        <nav className="sidebar-nav">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/explorer" className="active">Explorer</Link>
          <Link to="/courses">Courses</Link>
          <Link to="/tutor">AI tutor</Link>
          <Link to="/resources">Resources</Link>
          <Link to="/auth/login">Account</Link>
        </nav>
      </aside>

      <main className="main-column">
        <header className="page-topbar">
          <div>
            <p className="eyebrow muted">Medical terminology explorer</p>
            <h1>Explore terms and concepts</h1>
          </div>
          <button
            type="button"
            className="secondary-button icon-button"
            onClick={() => {
              setQuery('')
              setSearchParams({})
            }}
          >
            <Eraser size={16} />
            Clear search
          </button>
        </header>

        <section className="search-panel">
          <div className="field-group wide-field">
            <Search size={16} />
            <input
              aria-label="Search terms"
              placeholder="Search a term or subject"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </section>

        <section className="filter-row">
          <div className="chip-group">
            {['All', ...subjects.map((subject) => subject.name)].map((subject) => (
              <button
                key={subject}
                type="button"
                className={selectedSubject === subject ? 'chip active' : 'chip'}
                onClick={() => setSelectedSubject(subject)}
              >
                {subject}
              </button>
            ))}
          </div>

          <div className="chip-group compact-group">
            {['All', 'Beginner', 'Intermediate', 'University'].map((level) => (
              <button
                key={level}
                type="button"
                className={difficulty === level ? 'chip active' : 'chip'}
                onClick={() => setDifficulty(level)}
              >
                {level}
              </button>
            ))}
          </div>
        </section>

        <section className="mini-panel">
          <div className="mini-header">
            <h3>Search suggestions</h3>
            <SlidersHorizontal size={16} />
          </div>
          <div className="suggestion-row">
            {terms.slice(0, 5).map((term) => term.name).map((suggestion) => (
              <button key={suggestion} type="button" className="ghost-chip" onClick={() => setQuery(suggestion)}>
                {suggestion}
              </button>
            ))}
          </div>
        </section>

        <section className="list-section">
          <div className="panel-header-row">
            <h2>Matching terms</h2>
            <span>{loading ? 'Loading…' : `${filteredTerms.length} results`}</span>
          </div>

          <div className="cards-grid explorer-grid">
            {error ? (
              <div className="empty-panel" role="alert"><p>{error}</p></div>
            ) : loading ? (
              <p role="status">Loading terms…</p>
            ) : filteredTerms.length > 0 ? (
              filteredTerms.map((term) => (
                <Link key={term.id} to={`/term/${term.id}`} className="info-card term-card">
                  <div className="card-top-row">
                    <span className="tag">{term.subject}</span>
                    <span className="tag subtle">{term.difficulty}</span>
                  </div>
                  <h3>{term.name}</h3>
                  <p>{term.definition}</p>
                  <div className="meta-row">
                    <span>{term.pronunciation}</span>
                    <span>View details</span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="empty-panel">
                <BookOpenCheck size={28} />
                <h3>No terms match your filters.</h3>
                <p>Try a broader subject filter or a simpler search query.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
