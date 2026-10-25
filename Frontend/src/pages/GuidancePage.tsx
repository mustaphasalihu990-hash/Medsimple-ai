import { CalendarDays, CheckCircle2, Clock3, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { createStudyGoal, deleteStudyGoal, getStudyGoals, setStudyGoalCompleted, type StudyGoal } from '../lib/learningData'

export function GuidancePage() {
  const { session } = useAuth()
  const [goals, setGoals] = useState<StudyGoal[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadGoals = useCallback(async () => {
    if (!session?.user.id) return
    setLoading(true)
    setError('')
    try {
      setGoals(await getStudyGoals(session.user.id))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load your study goals.')
    } finally {
      setLoading(false)
    }
  }, [session?.user.id])

  useEffect(() => {
    void loadGoals()
  }, [loadGoals])

  async function addGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!session?.user.id || !title.trim()) return
    setSaving(true)
    setError('')
    try {
      await createStudyGoal(session.user.id, title, description, targetDate)
      setTitle('')
      setDescription('')
      setTargetDate('')
      await loadGoals()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save this goal.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleGoal(goal: StudyGoal) {
    if (!session?.user.id) return
    setError('')
    try {
      await setStudyGoalCompleted(session.user.id, goal.id, !goal.completed_at)
      await loadGoals()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update this goal.')
    }
  }

  async function removeGoal(goalId: string) {
    if (!session?.user.id) return
    setError('')
    try {
      await deleteStudyGoal(session.user.id, goalId)
      setGoals((current) => current.filter((goal) => goal.id !== goalId))
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete this goal.')
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
          <Link to="/guidance" className="active">Academic guidance</Link>
          <Link to="/study-skills">Study skills</Link>
        </nav>
      </aside>
      <main className="main-column">
        <header className="page-topbar">
          <div><p className="eyebrow muted">Academic guidance</p><h1>Plan your next study steps</h1></div>
        </header>
        <p className="guidance-note">These are general study-planning tools, not personalized or AI-generated academic advice. Human mentors and appointments are not connected to this app.</p>
        <section className="cards-grid guidance-grid">
          <article className="info-card">
            <CalendarDays size={22} />
            <h2>Prepare for an exam</h2>
            <p>List examinable topics, rate confidence for each, then schedule short practice sessions for the topics that need the most review.</p>
          </article>
          <article className="info-card">
            <Clock3 size={22} />
            <h2>Manage study time</h2>
            <p>Choose one specific task, work in a focused block, take a short break, and record what you completed before planning the next block.</p>
          </article>
          <article className="info-card">
            <CheckCircle2 size={22} />
            <h2>Set a measurable goal</h2>
            <p>Make each goal concrete and achievable, add a target date, and check progress using your completed lessons and practice activity.</p>
          </article>
        </section>

        {error && <p className="error-banner" role="alert">{error}</p>}
        <section className="panel-card">
          <h2>Create a study goal</h2>
          <form className="goal-form" onSubmit={addGoal}>
            <label className="field-block">Goal
              <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} required placeholder="Review cardiovascular physiology" />
            </label>
            <label className="field-block">Notes
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={1000} placeholder="What will you practice?" />
            </label>
            <label className="field-block">Target date
              <input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />
            </label>
            <button type="submit" className="primary-button" disabled={saving || !title.trim()}>
              <Plus size={16} /> {saving ? 'Saving…' : 'Add goal'}
            </button>
          </form>
        </section>

        <section className="panel-card">
          <h2>Your study goals</h2>
          {loading && <p role="status">Loading goals…</p>}
          {!loading && goals.length === 0 && <p>No goals yet. Add one above to make a plan.</p>}
          <ul className="goal-list">
            {goals.map((goal) => (
              <li key={goal.id} className={goal.completed_at ? 'goal-item completed' : 'goal-item'}>
                <button type="button" className="secondary-button small-button" onClick={() => void toggleGoal(goal)} aria-label={goal.completed_at ? 'Reopen goal' : 'Complete goal'}>
                  <CheckCircle2 size={16} />
                </button>
                <div>
                  <strong>{goal.title}</strong>
                  {goal.description && <p>{goal.description}</p>}
                  {goal.target_date && <small>Target: {goal.target_date}</small>}
                </div>
                <button type="button" className="ghost-icon" onClick={() => void removeGoal(goal.id)} aria-label={`Delete goal: ${goal.title}`}>
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}
