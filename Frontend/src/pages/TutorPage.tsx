import { Bot, Copy, RefreshCw, Send, Sparkles } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { askAssistant, type AssistantMessage, type AssistantMode } from '../lib/assistant'

export function TutorPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialMode: AssistantMode = searchParams.get('mode') === 'problem-solving' ? 'problem-solving' : 'tutor'
  const [mode, setMode] = useState<AssistantMode>(initialMode)
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastAssistantReply = [...messages].reverse().find((message) => message.role === 'assistant')

  async function requestAnswer(nextMessages: AssistantMessage[]) {
    setLoading(true)
    setError('')
    try {
      const answer = await askAssistant(nextMessages, mode)
      setMessages([...nextMessages, { role: 'assistant', content: answer }])
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }))
    } catch (requestError) {
      setMessages(nextMessages)
      setError(requestError instanceof Error ? requestError.message : 'The assistant could not respond.')
    } finally {
      setLoading(false)
    }
  }

  function submitPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = input.trim()
    if (!content || loading) return
    const nextMessages = [...messages, { role: 'user' as const, content }]
    setMessages(nextMessages)
    setInput('')
    void requestAnswer(nextMessages)
  }

  function changeMode(nextMode: AssistantMode) {
    setMode(nextMode)
    setSearchParams(nextMode === 'tutor' ? {} : { mode: nextMode })
  }

  async function copyResponse() {
    if (!lastAssistantReply) return
    try {
      await navigator.clipboard.writeText(lastAssistantReply.content)
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : 'Unable to copy this response.')
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
          <Link to="/study-skills">Study skills</Link>
          <Link to="/tutor" className="active">AI learning assistant</Link>
        </nav>
      </aside>
      <main className="main-column tutor-layout">
        <header className="page-topbar">
          <div>
            <p className="eyebrow muted">AI learning assistant</p>
            <h1>{mode === 'tutor' ? 'Ask a learning question' : 'Work through a problem'}</h1>
          </div>
          <div className="header-actions">
            <button type="button" className={mode === 'tutor' ? 'chip active' : 'chip'} onClick={() => changeMode('tutor')}>Explain a concept</button>
            <button type="button" className={mode === 'problem-solving' ? 'chip active' : 'chip'} onClick={() => changeMode('problem-solving')}>Solve step by step</button>
            <button type="button" className="secondary-button small-button" onClick={() => { setMessages([]); setError('') }}>
              <RefreshCw size={14} /> Clear
            </button>
          </div>
        </header>

        <p className="guidance-note"><Sparkles size={16} /> AI-generated educational guidance; responses can be wrong. For medical questions, this is not diagnosis or treatment advice. Verify important information with trusted academic or clinical sources.</p>

        <section className="panel-card chat-panel">
          <div className="chat-thread" ref={scrollRef} aria-live="polite">
            {messages.length === 0 && (
              <div className="empty-panel">
                <Bot size={28} />
                <h2>{mode === 'tutor' ? 'Start with a question' : 'Describe the problem'}</h2>
                <p>{mode === 'tutor'
                  ? 'Ask for an explanation, example, comparison, or a simpler description.'
                  : 'Share the question and your current thinking. The assistant will guide the reasoning before the conclusion.'}</p>
              </div>
            )}
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={message.role === 'user' ? 'message user' : 'message assistant'}>
                <div className="bubble"><p>{message.content}</p></div>
              </div>
            ))}
            {loading && (
              <div className="message assistant" role="status" aria-label="Assistant is thinking">
                <div className="bubble typing-bubble"><span /><span /><span /></div>
              </div>
            )}
          </div>

          {error && (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              <button type="button" className="link-button" onClick={() => void requestAnswer(messages)} disabled={loading || messages[messages.length - 1]?.role !== 'user'}>
                Retry
              </button>
            </div>
          )}
          {lastAssistantReply && (
            <button type="button" className="secondary-button small-button" onClick={() => void copyResponse()}>
              <Copy size={14} /> Copy latest answer
            </button>
          )}
          <form className="composer" onSubmit={submitPrompt}>
            <label className="sr-only" htmlFor="assistant-question">Your question</label>
            <textarea
              id="assistant-question"
              aria-label="Ask the assistant"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={3}
              maxLength={4000}
              placeholder={mode === 'tutor' ? 'Ask a follow-up question…' : 'Describe the problem you are working through…'}
              disabled={loading}
            />
            <div className="composer-actions">
              <small>{input.length}/4000</small>
              <button type="submit" className="primary-button small-button" disabled={loading || !input.trim()}>
                <Send size={14} /> {loading ? 'Thinking…' : 'Send'}
              </button>
            </div>
          </form>
        </section>
        <p className="info-label">Conversation history stays in this browser session and is not saved to your account.</p>
      </main>
    </div>
  )
}
