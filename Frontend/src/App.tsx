import { AuthPage } from './pages/AuthPage'
import { CoursesPage } from './pages/CoursesPage'
import { DashboardPage } from './pages/DashboardPage'
import { ExplorerPage } from './pages/ExplorerPage'
import { LandingPage } from './pages/LandingPage'
import { LessonPage } from './pages/LessonPage'
import { QuizPage } from './pages/QuizPage'
import { ResourcesPage } from './pages/ResourcesPage'
import { SettingsPage } from './pages/SettingsPage'
import { TermPage } from './pages/TermPage'
import { TutorPage } from './pages/TutorPage'
import { VideosPage } from './pages/VideosPage'
import { MaterialsPage } from './pages/MaterialsPage'
import { GuidancePage } from './pages/GuidancePage'
import { StudySkillsPage } from './pages/StudySkillsPage'
import { useAuth } from './context/AuthContext'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'

function RequireAuth() {
  const { session, loading, error } = useAuth()

  if (loading) return <main className="auth-page"><p role="status">Checking your session…</p></main>
  if (error) return <main className="auth-page"><p className="error-banner" role="alert">{error}</p></main>
  if (!session) return <Navigate to="/auth/login" replace />

  return <Outlet />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth/:mode" element={<AuthPage />} />
      <Route path="*" element={<LandingPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/explorer" element={<ExplorerPage />} />
        <Route path="/term/:termId" element={<TermPage />} />
        <Route path="/tutor" element={<TutorPage />} />
        <Route path="/resources" element={<ResourcesPage />} />
        <Route path="/videos" element={<VideosPage />} />
        <Route path="/materials" element={<MaterialsPage />} />
        <Route path="/guidance" element={<GuidancePage />} />
        <Route path="/study-skills" element={<StudySkillsPage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/courses/lesson" element={<LessonPage />} />
        <Route path="/quiz" element={<QuizPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}

export default App
