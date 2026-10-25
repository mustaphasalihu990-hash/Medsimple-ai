import { MoonStar, ShieldCheck, SlidersHorizontal, SunMedium } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { getUserPreferences, saveUserPreferences, type UserPreferences } from '../lib/learningData'

export function SettingsPage() {
  const { session } = useAuth()
  const { theme, setTheme } = useTheme()
  const [fullName, setFullName] = useState('')
  const [preferredLevel, setPreferredLevel] = useState<UserPreferences['preferred_level']>('Beginner')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const loadPreferences = useCallback(async () => {
    if (!session?.user.id) return
    setLoading(true)
    setError('')
    try {
      const preferences = await getUserPreferences(session.user.id)
      if (preferences) {
        setFullName(preferences.full_name)
        setPreferredLevel(preferences.preferred_level)
        setTheme(preferences.theme)
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load your preferences.')
    } finally {
      setLoading(false)
    }
  }, [session?.user.id, setTheme])

  useEffect(() => {
    void loadPreferences()
  }, [loadPreferences])

  async function updatePreferences(next: Partial<UserPreferences>) {
    if (!session?.user.id) return
    const preferences: UserPreferences = {
      full_name: next.full_name ?? fullName,
      preferred_level: next.preferred_level ?? preferredLevel,
      theme: next.theme ?? theme,
    }
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      await saveUserPreferences(session.user.id, preferences)
      setFullName(preferences.full_name)
      setPreferredLevel(preferences.preferred_level)
      setTheme(preferences.theme)
      setSaved(true)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save your preferences.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="app-shell dashboard-shell">
      <aside className="left-sidebar">
        <div className="brand-block"><div className="brand-mark">M</div><span>MedEase AI</span></div>
        <nav className="sidebar-nav">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/explorer">Explorer</Link>
          <Link to="/settings" className="active">Settings</Link>
        </nav>
      </aside>

      <main className="main-column">
        <header className="page-topbar">
          <div>
            <p className="eyebrow muted">Settings</p>
            <h1>Your learning preferences</h1>
          </div>
        </header>

        {loading && <p role="status">Loading preferences…</p>}
        {error && <p className="error-banner" role="alert">{error}</p>}
        {saved && <p className="success-banner" role="status">Preferences saved to your account.</p>}
        {!loading && (
          <>
            <section className="panel-card">
              <div className="panel-header-row">
                <h2>Appearance</h2>
                <SlidersHorizontal size={18} />
              </div>
              <div className="field-block" style={{ marginTop: 16 }}>
                <label>Theme</label>
                <div className="chip-group">
                  <button type="button" className={theme === 'light' ? 'chip active' : 'chip'} onClick={() => void updatePreferences({ theme: 'light' })} disabled={saving}>
                    <SunMedium size={14} /> Light
                  </button>
                  <button type="button" className={theme === 'dark' ? 'chip active' : 'chip'} onClick={() => void updatePreferences({ theme: 'dark' })} disabled={saving}>
                    <MoonStar size={14} /> Dark
                  </button>
                </div>
              </div>
            </section>

            <section className="panel-card">
              <div className="panel-header-row">
                <h2>Learning preferences</h2>
                <ShieldCheck size={18} />
              </div>
              <div className="field-block" style={{ marginTop: 16 }}>
                <label htmlFor="full-name">Full name</label>
                <input id="full-name" type="text" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
                <label htmlFor="preferred-level">Preferred learning level</label>
                <select id="preferred-level" value={preferredLevel} onChange={(event) => setPreferredLevel(event.target.value as UserPreferences['preferred_level'])}>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="University">University</option>
                </select>
                <button type="button" className="primary-button" onClick={() => void updatePreferences({})} disabled={saving}>
                  {saving ? 'Saving…' : 'Save preferences'}
                </button>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
