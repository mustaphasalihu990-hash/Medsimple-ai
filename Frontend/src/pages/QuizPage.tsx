import { CheckCircle2, ChevronRight, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getQuizQuestions, saveQuizAttempt, type QuizQuestion } from '../lib/learningData'

export function QuizPage() {
  const { session } = useAuth()
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [writtenAssessment, setWrittenAssessment] = useState<boolean | null>(null)
  const [sourceFilter, setSourceFilter] = useState('all')
  const [subjectFilter, setSubjectFilter] = useState('All')
  const [levelFilter, setLevelFilter] = useState('All')
  const [yearFilter, setYearFilter] = useState('All')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadQuestions = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setQuestions(await getQuizQuestions())
      setIndex(0)
      setSelected(null)
      setSubmitted(false)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load quiz questions.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadQuestions()
  }, [loadQuestions])

  const subjects = useMemo(() => [...new Set(questions.map((item) => item.subject))].sort(), [questions])
  const examYears = useMemo(
    () => [...new Set(questions.map((item) => item.exam_year).filter((year): year is number => year !== null))].sort((a, b) => b - a),
    [questions],
  )
  const filteredQuestions = useMemo(
    () => questions.filter((item) =>
      (sourceFilter === 'all' || item.source_type === sourceFilter)
      && (subjectFilter === 'All' || item.subject === subjectFilter)
      && (levelFilter === 'All' || item.academic_level === levelFilter)
      && (yearFilter === 'All' || item.exam_year === Number(yearFilter))
      && `${item.question} ${item.topic} ${item.subject} ${item.source_label ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()),
    ),
    [questions, sourceFilter, subjectFilter, levelFilter, yearFilter, query],
  )
  const question = filteredQuestions[index]
  const isWrittenAnswer = question?.question_type === 'written' || question?.question_type === 'written-answer'
  const progress = filteredQuestions.length ? ((index + 1) / filteredQuestions.length) * 100 : 0
  const isCorrect = useMemo(() => selected === question?.answer, [question, selected])

  async function submitAnswer() {
    if (!question || !selected || !session?.user.id) return
    if (isWrittenAnswer) {
      setSubmitted(true)
      return
    }
    setSaving(true)
    setError('')
    try {
      await saveQuizAttempt(session.user.id, question, selected, isCorrect)
      setSubmitted(true)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save your quiz answer.')
    } finally {
      setSaving(false)
    }
  }

  async function assessWrittenAnswer(understood: boolean) {
    if (!question || !selected || !session?.user.id) return
    setSaving(true)
    setError('')
    try {
      await saveQuizAttempt(session.user.id, question, selected, understood)
      setWrittenAssessment(understood)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save your self-assessment.')
    } finally {
      setSaving(false)
    }
  }

  function moveToNextQuestion() {
    setIndex((current) => current + 1)
    setSelected(null)
    setSubmitted(false)
    setWrittenAssessment(null)
  }

  function resetQuestionnaire() {
    setIndex(0)
    setSelected(null)
    setSubmitted(false)
    setWrittenAssessment(null)
  }

  return (
    <div className="app-shell dashboard-shell">
      <aside className="left-sidebar">
        <div className="brand-block"><div className="brand-mark">M</div><span>MedEase AI</span></div>
        <nav className="sidebar-nav">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/explorer">Explorer</Link>
          <Link to="/courses">Courses</Link>
          <Link to="/quiz" className="active">Quiz</Link>
          <Link to="/videos">Tutorial videos</Link>
          <Link to="/materials">Handouts</Link>
          <Link to="/guidance">Academic guidance</Link>
          <Link to="/study-skills">Study skills</Link>
        </nav>
      </aside>

      <main className="main-column">
        <header className="page-topbar">
          <div>
            <p className="eyebrow muted">Interactive quiz</p>
            <h1>{question ? `Question ${index + 1} of ${filteredQuestions.length}` : 'Questions and practice'}</h1>
          </div>
          <button
            type="button"
            className="secondary-button small-button"
            onClick={resetQuestionnaire}
            disabled={loading}
          >
            <RotateCcw size={14} /> Retake quiz
          </button>
        </header>

        <section className="course-controls" aria-label="Filter questions">
          <label className="field-group wide-field">
            <Search size={16} aria-hidden="true" />
            <input aria-label="Search questions" placeholder="Search question, topic, or source" value={query} onChange={(event) => { setQuery(event.target.value); resetQuestionnaire() }} />
          </label>
          <label className="field-group course-select">
            <span>Question source</span>
            <select value={sourceFilter} onChange={(event) => { setSourceFilter(event.target.value); resetQuestionnaire() }}>
              <option value="all">All questions</option>
              <option value="practice">Practice questions</option>
              <option value="past_exam">Past examination questions</option>
            </select>
          </label>
          <label className="field-group course-select">
            <span>Subject</span>
            <select value={subjectFilter} onChange={(event) => { setSubjectFilter(event.target.value); resetQuestionnaire() }}>
              <option>All</option>
              {subjects.map((subject) => <option key={subject}>{subject}</option>)}
            </select>
          </label>
          <label className="field-group course-select">
            <span>Academic level</span>
            <select value={levelFilter} onChange={(event) => { setLevelFilter(event.target.value); resetQuestionnaire() }}>
              <option>All</option>
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>University</option>
            </select>
          </label>
          <label className="field-group course-select">
            <span>Exam year</span>
            <select value={yearFilter} onChange={(event) => { setYearFilter(event.target.value); resetQuestionnaire() }}>
              <option value="All">All years</option>
              {examYears.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
        </section>

        {error && <p className="error-banner" role="alert">{error}</p>}
        {loading && <p role="status">Loading quiz…</p>}
        {!loading && !error && !question && (
          <div className="empty-panel">
            <h2>{sourceFilter === 'past_exam' ? 'No verified past examination questions are published yet.' : 'No questions match those filters.'}</h2>
            <p>Published past papers will be identified by their source and year. Existing questions are presented as practice only.</p>
          </div>
        )}
        {!loading && question && (
          <section className="panel-card">
            <div className="card-top-row">
              <span className="tag">{question.subject} · {question.academic_level}</span>
              <span className="tag subtle">
                {question.source_type === 'past_exam'
                  ? `Past exam${question.exam_year ? ` · ${question.exam_year}` : ''}${question.source_label ? ` · ${question.source_label}` : ''}`
                  : 'Practice question'}
              </span>
            </div>
            {question.topic && <p className="info-label">{question.topic}</p>}
            <div className="progress-bar large"><span style={{ width: `${progress}%` }} /></div>
            <h2 style={{ marginTop: 18 }}>{question.question}</h2>
            <div className="option-list" style={{ marginTop: 18 }}>
              {!isWrittenAnswer && question.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={selected === option ? 'choice active' : 'choice'}
                  onClick={() => !submitted && setSelected(option)}
                  disabled={submitted}
                >
                  {option}
                </button>
              ))}
              {isWrittenAnswer && (
                <label className="field-block">
                  <span>Your answer</span>
                  <textarea value={selected ?? ''} onChange={(event) => setSelected(event.target.value)} rows={5} maxLength={4000} disabled={submitted} />
                </label>
              )}
            </div>

            {selected && !submitted && (
              <button type="button" className="primary-button" style={{ marginTop: 18 }} onClick={() => void submitAnswer()} disabled={saving}>
                {saving ? 'Saving…' : isWrittenAnswer ? 'Review suggested answer' : 'Submit answer'}
              </button>
            )}

            {submitted && (
              <div style={{ marginTop: 18 }}>
                {isWrittenAnswer ? (
                  <>
                    <div className="panel-card">
                      <h3>Suggested answer</h3>
                      <p>{question.answer}</p>
                    </div>
                    {question.explanation && <p style={{ marginTop: 16 }}>{question.explanation}</p>}
                    {writtenAssessment === null ? (
                      <div className="rating-row" style={{ marginTop: 18 }}>
                        <button type="button" className="primary-button" onClick={() => void assessWrittenAnswer(true)} disabled={saving}>I understood it</button>
                        <button type="button" className="secondary-button" onClick={() => void assessWrittenAnswer(false)} disabled={saving}>I need to review</button>
                      </div>
                    ) : (
                      <p className="success-banner" role="status">{writtenAssessment ? 'Self-assessment saved.' : 'Marked for review; revisit this topic later.'}</p>
                    )}
                  </>
                ) : (
                  <>
                    <div className={isCorrect ? 'success-banner' : 'error-banner'}>
                      <CheckCircle2 size={18} />
                      <span>{isCorrect ? 'Correct answer.' : 'Not quite — review the explanation below.'}</span>
                    </div>
                    <p style={{ marginTop: 16 }}>{question.explanation}</p>
                  </>
                )}

                <div className="composer-actions" style={{ marginTop: 18 }}>
                  {index < filteredQuestions.length - 1 ? (
                    <button type="button" className="primary-button" onClick={moveToNextQuestion}>
                      Next question <ChevronRight size={16} />
                    </button>
                  ) : (
                    <Link to="/courses" className="primary-button">Return to courses</Link>
                  )}
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
