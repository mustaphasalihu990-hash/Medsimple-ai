import { CheckCircle2, Eye, EyeOff, Mail, Sparkles } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const authModes = ['login', 'signup', 'forgot', 'reset'] as const
type AuthMode = (typeof authModes)[number]

function isAuthMode(value: string | undefined): value is AuthMode {
  return authModes.includes(value as AuthMode)
}

export function AuthPage() {
  const { mode: routeMode } = useParams()
  const mode: AuthMode = isAuthMode(routeMode) ? routeMode : 'login'
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    setErrorMessage('')
    setSuccessMessage('')
  }, [mode])

  const title = {
    login: 'Welcome back',
    signup: 'Create your learning account',
    forgot: 'Reset your password',
    reset: 'Choose a new password',
  }[mode]

  const helperText = {
    login: 'Sign in with your email and password to continue learning.',
    signup: 'Create an account to save your learning progress.',
    forgot: 'We’ll email you a secure link to choose a new password.',
    reset: 'Choose a new password for your learning account.',
  }[mode]

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if ((mode === 'signup' || mode === 'reset') && password !== confirmation) {
      setErrorMessage('Your passwords do not match.')
      return
    }
    if ((mode === 'signup' || mode === 'reset') && password.length < 8) {
      setErrorMessage('Your password must be at least 8 characters long.')
      return
    }

    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        navigate('/dashboard', { replace: true })
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName.trim() },
            emailRedirectTo: `${window.location.origin}/auth/login`,
          },
        })
        if (error) throw error
        if (data.session) navigate('/dashboard', { replace: true })
        else setSuccessMessage('Account created. Check your email to confirm your address, then sign in.')
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset`,
        })
        if (error) throw error
        setSuccessMessage('If an account exists for that email, a password reset link has been sent.')
      } else {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
        setSuccessMessage('Password updated. You can now continue learning.')
        navigate('/dashboard', { replace: true })
      }
    } catch (authError) {
      setErrorMessage(authError instanceof Error ? authError.message : 'Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-panel">
        <div className="auth-hero">
          <div className="brand-block light-brand">
            <div className="brand-mark">M</div>
            <span>MedEase AI</span>
          </div>
          <div className="hero-copy">
            <Sparkles size={18} />
            <span>Learn difficult topics with clarity</span>
          </div>
        </div>

        <div className="auth-form-wrap">
          <div className="auth-header">
            <h1>{title}</h1>
            <p>{helperText}</p>
          </div>

          <form onSubmit={submitAuth}>
            {mode === 'signup' && (
              <div className="field-block">
                <label htmlFor="full-name">Full name</label>
                <input id="full-name" type="text" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
              </div>
            )}

            {mode !== 'reset' && (
              <div className="field-block">
                <label htmlFor="email">Email</label>
                <div className="input-with-icon">
                  <Mail size={16} aria-hidden="true" />
                  <input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
                </div>
              </div>
            )}

            {mode !== 'forgot' && (
              <div className="field-block">
                <label htmlFor="password">{mode === 'reset' ? 'New password' : 'Password'}</label>
                <div className="input-with-icon password-field">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={mode === 'signup' || mode === 'reset' ? 8 : undefined}
                    required
                  />
                  <button type="button" aria-label="Toggle password visibility" onClick={() => setShowPassword((value) => !value)}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {(mode === 'signup' || mode === 'reset') && (
              <div className="field-block">
                <label htmlFor="confirm-password">Confirm password</label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  minLength={8}
                  required
                />
              </div>
            )}

            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? 'Please wait…' : {
                login: 'Log in',
                signup: 'Create account',
                forgot: 'Send reset email',
                reset: 'Update password',
              }[mode]}
            </button>
          </form>

          {errorMessage && <div className="error-banner" role="alert">{errorMessage}</div>}
          {successMessage && (
            <div className="success-banner" role="status">
              <CheckCircle2 size={18} />
              <span>{successMessage}</span>
            </div>
          )}

          <div className="auth-links">
            {mode !== 'signup' && <Link className="link-button" to="/auth/signup">Create an account</Link>}
            {mode !== 'login' && <Link className="link-button" to="/auth/login">Back to login</Link>}
            {mode !== 'forgot' && mode !== 'reset' && <Link className="link-button" to="/auth/forgot">Forgot password?</Link>}
          </div>
        </div>
      </div>
    </div>
  )
}
