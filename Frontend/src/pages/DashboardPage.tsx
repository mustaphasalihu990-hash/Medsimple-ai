import { Activity, BookOpenCheck, CalendarRange, CheckCircle2, ClipboardList, Download, Flame, GraduationCap, Lightbulb, PlayCircle, Sparkles, TrendingUp, Wrench } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getDashboardData, type DashboardData } from '../lib/learningData'

function formatActivityTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function DashboardPage() {
  const { session, signOut } = useAuth()
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadDashboard = useCallback(async () => {
    if (!session?.user.id) return
    setLoading(true)
    setError('')
    try {
      setDashboard(await getDashboardData(session.user.id))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load your dashboard.')
    } finally {
      setLoading(false)
    }
  }, [session?.user.id])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  async function handleSignOut() {
    try {
      await signOut()
      navigate('/', { replace: true })
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : 'Unable to sign out.')
    }
  }

  const stats = dashboard ? [
    { label: 'Terms reviewed', value: dashboard.termsReviewed, trend: 'Based on your activity' },
    { label: 'Quiz accuracy', value: dashboard.quizAccuracy === null ? '—' : `${dashboard.quizAccuracy}%`, trend: 'Across your attempts' },
    { label: 'Study streak', value: `${dashboard.studyStreak} days`, trend: dashboard.studyStreak ? 'Keep it going' : 'Start a study session' },
    { label: 'Saved topics', value: dashboard.savedTopics, trend: 'Your bookmarks' },
  ] : []
  const featureLinks = dashboard ? [
    { title: 'AI Learning Assistant', description: 'Ask questions and get learning explanations.', to: '/tutor', icon: Sparkles, status: 'Requires the configured backend AI service' },
    { title: 'Tutorial Videos', description: 'Browse verified video lessons by topic and level.', to: '/videos', icon: PlayCircle, status: dashboard.videoCount ? `${dashboard.videoCount} published` : 'No verified videos published yet' },
    { title: 'Downloadable Handouts', description: 'Preview PDFs and download study materials.', to: '/materials', icon: Download, status: dashboard.materialCount ? `${dashboard.materialCount} published` : 'No handouts published yet' },
    { title: 'Past Questions & Practice', description: 'Practise and review answers with explanations.', to: '/quiz', icon: ClipboardList, status: dashboard.pastExamQuestionCount ? `${dashboard.pastExamQuestionCount} sourced past questions` : `${dashboard.practiceQuestionCount} practice questions; no past papers` },
    { title: 'Academic Guidance', description: 'Set study goals and plan your learning.', to: '/guidance', icon: GraduationCap, status: `${dashboard.openGoalCount} active goals` },
    { title: 'Question-and-Answer Support', description: 'Continue a session with the learning assistant.', to: '/tutor', icon: BookOpenCheck, status: 'AI-generated; verify important information' },
    { title: 'Study Skills', description: 'Use active recall and spaced-repetition cards.', to: '/study-skills', icon: Lightbulb, status: `${dashboard.dueFlashcardCount} cards due` },
    { title: 'Problem-Solving Assistance', description: 'Work through a difficult problem step by step.', to: '/tutor?mode=problem-solving', icon: Wrench, status: 'AI-generated; verify important information' },
    { title: 'Academic Performance', description: 'Review your recorded quiz and study activity.', to: '/dashboard', icon: TrendingUp, status: 'Based only on your account activity' },
  ] : []

  return (
    <div className="app-shell dashboard-shell">
      <aside className="left-sidebar">
        <div className="brand-block">
          <div className="brand-mark">M</div>
          <span>MedEase AI</span>
        </div>
        <nav className="sidebar-nav">
          <Link to="/dashboard" className="active">Dashboard</Link>
          <Link to="/explorer">Explorer</Link>
          <Link to="/courses">Courses</Link>
          <Link to="/tutor">AI tutor</Link>
          <Link to="/resources">Resources</Link>
          <Link to="/settings">Settings</Link>
        </nav>
      </aside>

      <main className="main-column">
        <header className="page-topbar">
          <div>
            <p className="eyebrow muted">Welcome back{session?.user.email ? `, ${session.user.email}` : ''}</p>
            <h1>Ready to learn something new?</h1>
          </div>
          <div className="header-actions">
            <Link to="/courses" className="primary-button small-button">Continue learning</Link>
            <button type="button" className="secondary-button small-button" onClick={handleSignOut}>Sign out</button>
          </div>
        </header>

        {error && <p className="error-banner" role="alert">{error}</p>}
        {loading && <p role="status">Loading your learning activity…</p>}
        {!loading && !error && dashboard && (
          <>
            <section className="stats-grid">
              {stats.map((stat) => (
                <article key={stat.label} className="info-card stat-card">
                  <div className="stat-meta">
                    <span>{stat.label}</span>
                    <TrendingUp size={16} />
                  </div>
                  <strong>{stat.value}</strong>
                  <small>{stat.trend}</small>
                </article>
              ))}
            </section>

            <section className="panel-card">
              <div className="panel-header-row">
                <h2>Learning tools</h2>
              </div>
              <div className="cards-grid dashboard-feature-grid">
                {featureLinks.map(({ title, description, to, icon: Icon, status }) => (
                  <Link key={title} to={to} className="info-card feature-link-card">
                    <div className="feature-link-heading"><Icon size={20} /><span className="tag subtle">{status}</span></div>
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </Link>
                ))}
              </div>
            </section>

            <section className="content-grid two-column">
              <article className="panel-card">
                <div className="panel-header-row">
                  <h2>Continue learning</h2>
                  <Link to="/courses" className="link-button">View all</Link>
                </div>
                <div className="study-stack">
                  {dashboard.courses.map((course) => (
                    <div key={course.id} className="study-item">
                      <div>
                        <h3>{course.title}</h3>
                        <p>{course.subject}</p>
                      </div>
                      <div className="progress-block">
                        <span>{course.progress}%</span>
                        <div className="progress-bar">
                          <span style={{ width: `${course.progress}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                  {dashboard.courses.length === 0 && <p>No courses are available yet.</p>}
                </div>
              </article>

              <article className="panel-card">
                <div className="panel-header-row">
                  <h2>Recently studied terms</h2>
                  <Link to="/explorer" className="link-button">Open explorer</Link>
                </div>
                <ul className="term-list">
                  {dashboard.recentTerms.map((term) => (
                    <li key={term.id}>
                      <Link to={`/term/${term.id}`}>{term.name}</Link>
                      <small>{term.subject}</small>
                    </li>
                  ))}
                  {dashboard.recentTerms.length === 0 && <li>Open a term to see it here.</li>}
                </ul>
              </article>
            </section>

            <section className="content-grid two-column">
              <article className="panel-card">
                <div className="panel-header-row">
                  <h2>Recent quiz answers</h2>
                  <Link to="/quiz" className="link-button">Practice</Link>
                </div>
                <div className="score-row">
                  {dashboard.recentQuizAttempts.map((attempt) => (
                    <div key={attempt.id} className="score-item">
                      <CheckCircle2 size={18} />
                      <span>{attempt.question}</span>
                      <strong>{attempt.is_correct ? 'Correct' : 'Review'}</strong>
                    </div>
                  ))}
                  {dashboard.recentQuizAttempts.length === 0 && <p>Complete a quiz question to see your results.</p>}
                </div>
              </article>

              <article className="panel-card">
                <div className="panel-header-row">
                  <h2>Recent learning activity</h2>
                  <Activity size={18} />
                </div>
                <ul className="activity-list">
                  {dashboard.activities.map((item) => (
                    <li key={item.id}>
                      <CalendarRange size={16} />
                      <div>
                        <strong>{item.target_label}</strong>
                        <small>{formatActivityTime(item.created_at)}</small>
                      </div>
                    </li>
                  ))}
                  {dashboard.activities.length === 0 && <li><Flame size={16} /> Your learning activity will appear here.</li>}
                </ul>
              </article>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
