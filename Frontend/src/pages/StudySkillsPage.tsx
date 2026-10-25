import { BrainCircuit, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getDueFlashcards, saveFlashcardReview, type DueFlashcard } from '../lib/learningData'

const ratings = [
  { value: 'again', label: 'Again · 10 min' },
  { value: 'hard', label: 'Hard' },
  { value: 'good', label: 'Good' },
  { value: 'easy', label: 'Easy' },
] as const

export function StudySkillsPage() {
  const { session } = useAuth()
  const [cards, setCards] = useState<DueFlashcard[]>([])
  const [revealed, setRevealed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const card = cards[0]

  const loadCards = useCallback(async () => {
    if (!session?.user.id) return
    setLoading(true)
    setError('')
    try {
      setCards(await getDueFlashcards(session.user.id))
      setRevealed(false)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load flashcards.')
    } finally {
      setLoading(false)
    }
  }, [session?.user.id])

  useEffect(() => {
    void loadCards()
  }, [loadCards])

  async function rateCard(rating: typeof ratings[number]['value']) {
    if (!session?.user.id || !card) return
    setSaving(true)
    setError('')
    try {
      await saveFlashcardReview(session.user.id, card, rating)
      setCards((current) => current.slice(1))
      setRevealed(false)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save your review.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="app-shell dashboard-shell">
      <aside className="left-sidebar">
        <div className="brand-block"><div className="brand-mark">M</div><span>MedSimple AI</span></div>
        <nav className="sidebar-nav">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/videos">Tutorial videos</Link>
          <Link to="/materials">Handouts</Link>
          <Link to="/quiz">Past questions & practice</Link>
          <Link to="/guidance">Academic guidance</Link>
          <Link to="/study-skills" className="active">Study skills</Link>
        </nav>
      </aside>
      <main className="main-column">
        <header className="page-topbar">
          <div><p className="eyebrow muted">Study skills</p><h1>Active recall and spaced repetition</h1></div>
          <button type="button" className="secondary-button small-button" onClick={() => void loadCards()} disabled={loading}>
            <RotateCcw size={14} /> Refresh due cards
          </button>
        </header>
        <section className="cards-grid guidance-grid">
          <article className="info-card"><BrainCircuit size={22} /><h2>Active recall</h2><p>Try to explain an idea from memory before revealing the explanation. Check gaps, then retrieve it again later.</p></article>
          <article className="info-card"><h2>Spaced repetition</h2><p>Rate how well you recalled each term. Review timing is saved to your account and adjusted from your ratings.</p></article>
          <article className="info-card"><h2>Self-assessment</h2><p>Mark difficult topics honestly and schedule another retrieval session instead of rereading passively.</p></article>
        </section>
        {error && <p className="error-banner" role="alert">{error}</p>}
        <section className="panel-card flashcard-panel">
          {loading ? <p role="status">Loading due flashcards…</p> : card ? (
            <>
              <p className="eyebrow muted">{card.term.subject} · {card.term.difficulty} · {cards.length} due</p>
              <h2>{card.term.name}</h2>
              {!revealed ? (
                <button type="button" className="primary-button" onClick={() => setRevealed(true)}>Reveal explanation</button>
              ) : (
                <>
                  <p>{card.term.beginner_explanation}</p>
                  <p className="info-label">Key points</p>
                  <ul>{card.term.key_points.map((point) => <li key={point}>{point}</li>)}</ul>
                  <div className="rating-row" aria-label="Rate your recall">
                    {ratings.map((rating) => (
                      <button key={rating.value} type="button" className="secondary-button" onClick={() => void rateCard(rating.value)} disabled={saving}>
                        {rating.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="empty-panel">
              <h2>All caught up</h2>
              <p>No flashcards are due now. Study sessions here use saved term explanations and user-specific spaced-repetition progress.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
