import { Bookmark, CheckCircle2, Copy, Link2, PlayCircle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getBookmarkedTermIds, getTerm, recordActivity, setTermBookmark, type Term } from '../lib/learningData'

export function TermPage() {
  const { termId } = useParams()
  const { session } = useAuth()
  const [term, setTerm] = useState<Term | null>(null)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [selectedLevel, setSelectedLevel] = useState<'Beginner' | 'Intermediate' | 'University'>('Beginner')
  const [loading, setLoading] = useState(true)
  const [savingBookmark, setSavingBookmark] = useState(false)
  const [error, setError] = useState('')

  const loadTerm = useCallback(async () => {
    if (!termId || !session?.user.id) return
    setLoading(true)
    setError('')
    try {
      const [nextTerm, bookmarkedIds] = await Promise.all([
        getTerm(termId),
        getBookmarkedTermIds(session.user.id),
      ])
      setTerm(nextTerm)
      setIsBookmarked(bookmarkedIds.includes(termId))
      if (nextTerm) {
        await recordActivity(session.user.id, 'term_view', 'term', nextTerm.id, `Reviewed ${nextTerm.name}`)
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load this term.')
    } finally {
      setLoading(false)
    }
  }, [termId, session?.user.id])

  useEffect(() => {
    void loadTerm()
  }, [loadTerm])

  async function toggleBookmark() {
    if (!term || !session?.user.id) return
    setSavingBookmark(true)
    setError('')
    try {
      await setTermBookmark(session.user.id, term, isBookmarked)
      setIsBookmarked((current) => !current)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update this bookmark.')
    } finally {
      setSavingBookmark(false)
    }
  }

  async function copyDefinition() {
    if (!term) return
    try {
      await navigator.clipboard.writeText(term.definition)
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : 'Unable to copy the definition.')
    }
  }

  if (loading) return <main className="main-column"><p role="status">Loading term…</p></main>
  if (error && !term) return <main className="main-column"><p className="error-banner" role="alert">{error}</p></main>
  if (!term) return <main className="main-column"><p>This term could not be found.</p><Link to="/explorer">Back to explorer</Link></main>

  return (
    <div className="app-shell term-shell">
      <aside className="left-sidebar">
        <div className="brand-block"><div className="brand-mark">M</div><span>MedEase AI</span></div>
        <nav className="sidebar-nav">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/explorer" className="active">Term details</Link>
          <Link to="/courses">Courses</Link>
          <Link to="/tutor">AI tutor</Link>
        </nav>
      </aside>

      <main className="main-column">
        <header className="page-topbar sticky-topbar">
          <div>
            <p className="eyebrow muted">{term.subject}</p>
            <h1>{term.name}</h1>
          </div>
          <div className="header-actions">
            <button type="button" className="secondary-button small-button" onClick={() => void copyDefinition()}>
              <Copy size={14} /> Copy definition
            </button>
            <button type="button" className="primary-button small-button" onClick={() => void toggleBookmark()} disabled={savingBookmark}>
              <Bookmark size={14} /> {savingBookmark ? 'Saving…' : isBookmarked ? 'Saved' : 'Bookmark'}
            </button>
          </div>
        </header>

        {error && <p className="error-banner" role="alert">{error}</p>}

        <section className="term-summary panel-card">
          <div className="summary-grid">
            <div><p className="info-label">Pronunciation</p><strong>{term.pronunciation}</strong></div>
            <div><p className="info-label">Category</p><strong>{term.subject}</strong></div>
            <div><p className="info-label">Difficulty</p><strong>{term.difficulty}</strong></div>
          </div>
          <p className="term-definition">{term.definition}</p>
        </section>

        <section className="level-tabs panel-card">
          {(['Beginner', 'Intermediate', 'University'] as const).map((level) => (
            <button
              key={level}
              type="button"
              className={selectedLevel === level ? 'tab-button active' : 'tab-button'}
              onClick={() => setSelectedLevel(level)}
            >
              {level}
            </button>
          ))}
        </section>

        <section className="info-stack">
          <article className="panel-card">
            <h2>{selectedLevel === 'Beginner' ? 'Beginner-friendly explanation' : `${selectedLevel} explanation`}</h2>
            <p>
              {selectedLevel === 'Beginner' && term.beginner_explanation}
              {selectedLevel === 'Intermediate' && term.definition}
              {selectedLevel === 'University' && term.university_explanation}
            </p>
          </article>
          <article className="panel-card">
            <h2>Key points</h2>
            <ul className="bullet-list">{term.key_points.map((point) => <li key={point}>{point}</li>)}</ul>
          </article>
          <article className="panel-card"><h2>Practical significance</h2><p>{term.clinical_significance}</p></article>
          <article className="panel-card"><h2>Real-life example</h2><p>{term.example}</p></article>
          <article className="panel-card"><h2>Analogy</h2><p>{term.analogy}</p></article>
          <article className="panel-card">
            <h2>Common misconceptions</h2>
            <ul className="bullet-list">{term.misconceptions.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
          <article className="panel-card">
            <h2>Related terminology</h2>
            <div className="tag-wrap">{term.related_terms.map((item) => <span key={item} className="tag">{item}</span>)}</div>
          </article>
          <article className="panel-card">
            <h2>Suggested visual resources</h2>
            <div className="tag-wrap">{term.suggested_visuals.map((item) => <span key={item} className="tag subtle">{item}</span>)}</div>
          </article>
          <article className="panel-card">
            <h2>Video recommendations</h2>
            <div className="resource-list">
              {term.videos.map((video) => (
                <div key={video.title} className="resource-item">
                  <div className="resource-icon"><PlayCircle size={18} /></div>
                  <div><strong>{video.title}</strong><span>{video.source} · {video.duration}</span></div>
                </div>
              ))}
            </div>
          </article>
          <article className="panel-card">
            <h2>External learning resources</h2>
            <div className="resource-list">
              {term.resources.map((resource) => (
                <a key={resource.title} href={resource.url} target="_blank" rel="noreferrer" className="resource-item">
                  <div className="resource-icon"><Link2 size={18} /></div>
                  <div><strong>{resource.title}</strong><span>{resource.source}</span></div>
                </a>
              ))}
            </div>
          </article>
          <article className="panel-card">
            <h2>Practice questions</h2>
            <ul className="bullet-list">{term.practice_questions.map((question) => <li key={question}>{question}</li>)}</ul>
          </article>
        </section>
      </main>
    </div>
  )
}
