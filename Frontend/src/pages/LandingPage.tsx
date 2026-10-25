import { ArrowRight, BookOpen, BrainCircuit, ChevronRight, GraduationCap, MoonStar, Search, Sparkles, Video } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ThemeToggle } from '../components/ThemeToggle'
import { getQuizQuestions, getSubjects, getTerms, type QuizQuestion, type Subject, type Term } from '../lib/learningData'

const features = [
  { title: 'Simple explanations', icon: BookOpen },
  { title: 'AI tutor integration in progress', icon: BrainCircuit },
  { title: 'Interactive quizzes', icon: GraduationCap },
  { title: 'Video recommendations', icon: Video },
  { title: 'Progress tracking', icon: MoonStar },
  { title: 'Saved terminology', icon: Search },
]

export function LandingPage() {
  const [query, setQuery] = useState('Homeostasis')
  const [terms, setTerms] = useState<Term[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [quizQuestion, setQuizQuestion] = useState<QuizQuestion | null>(null)
  const [loading, setLoading] = useState(true)
  const [catalogError, setCatalogError] = useState('')
  const navigate = useNavigate()
  const activeTerm = useMemo(() => terms[0] ?? null, [terms])

  const loadLandingContent = useCallback(async () => {
    setLoading(true)
    setCatalogError('')
    try {
      const [nextTerms, nextSubjects, questions] = await Promise.all([
        getTerms(),
        getSubjects(),
        getQuizQuestions(),
      ])
      setTerms(nextTerms)
      setSubjects(nextSubjects)
      setQuizQuestion(questions[0] ?? null)
    } catch (loadError) {
      setCatalogError(loadError instanceof Error ? loadError.message : 'Unable to load learning content.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadLandingContent()
  }, [loadLandingContent])

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const searchQuery = query.trim()
    navigate(searchQuery ? `/explorer?q=${encodeURIComponent(searchQuery)}` : '/explorer')
  }

  return (
    <div className="app-shell landing-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark">M</div>
          <span>MedEase AI</span>
        </div>

        <nav className="nav-links" aria-label="Main navigation">
          <a href="#features">Features</a>
          <a href="#explore">Explore subjects</a>
          <a href="#how-it-works">How it works</a>
        </nav>

        <div className="nav-actions">
          <Link to="/auth/login" className="link-button">Sign in</Link>
          <Link to="/auth/login" className="primary-button small">Get started</Link>
          <ThemeToggle />
        </div>
      </header>

      <main>
        {catalogError && <p className="error-banner" role="alert">{catalogError}</p>}
        <section className="hero-section">
          <div className="hero-copy">
            <div className="eyebrow">
              <Sparkles size={14} />
              Learn clearer, faster, and with confidence
            </div>
            <h1 className="hero">Complex Medical Terms. Clearer Understanding.</h1>
            <p className="hero-subheading">
              MedEase AI helps students turn difficult medical, scientific, and psychological ideas into simple,
              memorable learning experiences.
            </p>

            <form className="search-box" onSubmit={handleSearch}>
              <Search size={18} />
              <input
                aria-label="Search for a term"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search a term, concept, or subject"
              />
              <button type="submit" className="primary-button">Search</button>
            </form>

            <div className="hero-actions">
              <Link to="/explorer" className="primary-button">
                Explore learning <ArrowRight size={18} />
              </Link>
              <a href="#explore" className="secondary-button">
                Explore subjects
              </a>
            </div>
          </div>

          <div className="hero-preview">
            {activeTerm ? (
              <div className="preview-card">
                <div className="preview-header">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </div>
                <div className="preview-body">
                  <div className="preview-line featured-line">
                    <span className="label">Term</span>
                    <strong>{activeTerm.name}</strong>
                  </div>
                  <div className="preview-line">
                    <span className="label">Pronunciation</span>
                    <span>{activeTerm.pronunciation}</span>
                  </div>
                  <p>{activeTerm.definition}</p>
                  <div className="badge-group">
                    <span>{activeTerm.subject}</span>
                    <span>{activeTerm.difficulty}</span>
                  </div>
                  <Link to={`/term/${activeTerm.id}`} className="text-button">
                    Explore full explanation <ChevronRight size={16} />
                  </Link>
                </div>
              </div>
            )
              : <div className="preview-card"><p>{loading ? 'Loading learning content…' : 'No terms are available yet.'}</p></div>}
          </div>
        </section>

        <section id="explore" className="content-section">
          <div className="section-heading">
            <p>Explore by subject</p>
            <h2>Build understanding across the sciences</h2>
          </div>
          <div className="grid cards-grid subject-grid">
            {subjects.map((subject) => (
              <article key={subject.name} className="info-card subject-card">
                <div className={`icon-pill ${subject.color}`} aria-hidden="true">{subject.icon}</div>
                <h3>{subject.name}</h3>
                <p>{subject.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="features" className="content-section alt-section">
          <div className="section-heading">
            <p>Learning features</p>
            <h2>Every study session is designed to make complex ideas easier</h2>
          </div>
          <div className="grid cards-grid features-grid">
            {features.map(({ title, icon: Icon }) => (
              <div key={title} className="info-card feature-card">
                <div className="mini-icon"><Icon size={18} /></div>
                <h3>{title}</h3>
                <p>Learn with structured explanations and focused revision pathways.</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="content-section">
          <div className="section-heading">
            <p>How it works</p>
            <h2>From a question to confident understanding</h2>
          </div>
          <div className="step-grid">
            {[
              'Search for a term',
              'Understand the concept',
              'Explore related resources',
              'Test your knowledge',
              'Track your progress',
            ].map((step, index) => (
              <div key={step} className="step-card">
                <span>{index + 1}</span>
                <h3>{step}</h3>
              </div>
            ))}
          </div>
        </section>

        {activeTerm && <section className="content-section example-section">
          <div className="term-showcase">
            <div className="showcase-copy">
              <p className="eyebrow muted">Example learning experience</p>
              <h2>{activeTerm.name}</h2>
              <p>{activeTerm.beginner_explanation}</p>
              <ul className="check-list">
                {activeTerm.key_points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              <Link to={`/term/${activeTerm.id}`} className="secondary-button">Open term</Link>
            </div>
            <div className="quiz-panel">
              {quizQuestion ? (
                <>
                  <span className="pill">Practice question</span>
                  <h3>{quizQuestion.question}</h3>
                  <div className="option-list">
                    {quizQuestion.options.slice(0, 3).map((option) => <span key={option} className="choice">{option}</span>)}
                  </div>
                  <Link to="/quiz" className="text-button">Try the quiz <ChevronRight size={16} /></Link>
                </>
              ) : <p>{loading ? 'Loading questions…' : 'No quiz questions are available yet.'}</p>}
            </div>
          </div>
        </section>}

        <section className="cta-section">
          <div>
            <p className="eyebrow muted">Start learning</p>
            <h2>Build confidence in scientific and medical terminology.</h2>
          </div>
          <Link to="/explorer" className="primary-button">
            Begin exploring <ArrowRight size={18} />
          </Link>
        </section>
      </main>

      <footer className="site-footer">
        <div>
          <div className="brand-block">
            <div className="brand-mark">M</div>
            <span>MedEase AI</span>
          </div>
          <p>Educational resources and explanations are for learning support only and should be checked against trusted academic sources.</p>
        </div>
        <div className="footer-links">
          <a href="#features">Features</a>
          <a href="#explore">Subjects</a>
          <a href="/auth/login">Sign in</a>
          <a href="/explorer">Explore</a>
        </div>
      </footer>
    </div>
  )
}
