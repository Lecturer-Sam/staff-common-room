import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Sidebar from './components/Sidebar'
import StudentLayout from './components/StudentLayout'
import OfflineIndicator from './components/OfflineIndicator'
import PendingApproval from './components/PendingApproval'
import Landing from './pages/Landing'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import Feed from './pages/Feed'
import Curriculum from './pages/Curriculum'
import SubjectBrowser from './pages/SubjectBrowser'
import Wisdom from './pages/Wisdom'
import Forecasts from './pages/Forecasts'
import ForecastForm from './pages/ForecastForm'
import ForecastView from './pages/ForecastView'
import LessonPlans from './pages/LessonPlans'
import LessonPlanForm from './pages/LessonPlanForm'
import LessonPlanView from './pages/LessonPlanView'
import Profile from './pages/Profile'
import Members from './pages/Members'
import Deliveries from './pages/Deliveries'
import PublicVacancies from './pages/PublicVacancies'
import PublicQuotes from './pages/PublicQuotes'
import PublicCalendar from './pages/PublicCalendar'
import PublicArticles from './pages/PublicArticles'
import PublicArticleView from './pages/PublicArticleView'
import QuestionBank from './pages/QuestionBank'
import QuestionForm from './pages/QuestionForm'
import QuestionGenerator from './pages/QuestionGenerator'
import QuizMaker from './pages/QuizMaker'
import AuthorPage from './pages/AuthorPage'
import Search from './pages/Search'
import Progress from './pages/Progress'
import Calendar from './pages/Calendar'
import Articles from './pages/Articles'
import ArticleForm from './pages/ArticleForm'
import ArticleView from './pages/ArticleView'
import MyWall from './pages/MyWall'
import Notes from './pages/Notes'
import NoteForm from './pages/NoteForm'
import NoteView from './pages/NoteView'
import Plans from './pages/Plans'
import Billing from './pages/Billing'
import Schools from './pages/Schools'
import SchoolWorkspace from './pages/SchoolWorkspace'
import Classrooms from './pages/Classrooms'
import Learn from './pages/student/Learn'
import QuizPlayer from './pages/student/QuizPlayer'
import Materials from './pages/Materials'


function ProtectedLayout() {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading || (user && profile === undefined)) {
    return (
      <div className="portal-loading">
        Loading…
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />

  const status = profile?.status ?? 'pending'
  const isAdmin = profile?.role === 'admin'
  if (!isAdmin && status === 'suspended') return <PendingApproval suspended />
  if (!isAdmin && status !== 'approved') return <PendingApproval />

  // ── Pupils (Phase 3): their own minimal layout, confined to /learn ──
  if (profile?.role === 'student') {
    if (!location.pathname.startsWith('/portal/learn')) {
      return <Navigate to="/portal/learn" replace />
    }
    return (
      <StudentLayout>
        <Outlet />
      </StudentLayout>
    )
  }

  return (
    <div className="portal-shell">
      <Sidebar />
      <div className="portal-workspace">
        <main className="portal-main">
          <div className="portal-page">
            <Outlet />
          </div>
        </main>
      </div>
      <OfflineIndicator />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      {/* ── Public routes ── */}
      <Route path="/" element={<Landing />} />
      <Route path="/vacancies" element={<PublicVacancies />} />
      <Route path="/quotes" element={<PublicQuotes />} />
      <Route path="/calendar" element={<PublicCalendar />} />
      <Route path="/articles" element={<PublicArticles />} />
      <Route path="/articles/:articleId" element={<PublicArticleView />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />

      {/* ── Protected portal ── */}
      <Route path="/portal" element={<ProtectedLayout />}>
        <Route index element={<Feed />} />
        <Route path="curriculum" element={<Curriculum />} />
        <Route path="curriculum/:subjectId" element={<SubjectBrowser />} />
        <Route path="wisdom" element={<Wisdom />} />
        <Route path="articles" element={<Articles />} />
        <Route path="articles/new" element={<ArticleForm />} />
        <Route path="articles/:articleId" element={<ArticleView />} />
        <Route path="articles/:articleId/edit" element={<ArticleForm />} />
        <Route path="forecasts" element={<Forecasts />} />
        <Route path="forecasts/new" element={<ForecastForm />} />
        <Route path="forecasts/:forecastId" element={<ForecastView />} />
        <Route path="forecasts/:forecastId/edit" element={<ForecastForm />} />
        <Route path="plans" element={<LessonPlans />} />
        <Route path="materials" element={<Materials />} />
        <Route path="plans/new" element={<LessonPlanForm />} />
        <Route path="plans/:planId" element={<LessonPlanView />} />
        <Route path="plans/:planId/edit" element={<LessonPlanForm />} />
        <Route path="questions" element={<QuestionBank />} />
        <Route path="questions/new" element={<QuestionForm />} />
        <Route path="questions/generate" element={<QuestionGenerator />} />
        <Route path="questions/quiz" element={<QuizMaker />} />
        <Route path="questions/:questionId/edit" element={<QuestionForm />} />
        <Route path="wall" element={<MyWall />} />
        <Route path="notes" element={<Notes />} />
        <Route path="notes/new" element={<NoteForm />} />
        <Route path="notes/:noteId" element={<NoteView />} />
        <Route path="notes/:noteId/edit" element={<NoteForm />} />
        <Route path="authors/:authorId" element={<AuthorPage />} />
        <Route path="search" element={<Search />} />
        <Route path="progress" element={<Progress />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="profile" element={<Profile />} />
        <Route path="deliveries" element={<Deliveries />} />
        {/* ── Phase 2 multi-tenancy ────────────────────────────────── */}
        <Route path="school" element={<SchoolWorkspace />} />
        <Route path="schools" element={<Schools />} />
        <Route path="schools/:schoolId" element={<SchoolWorkspace />} />
        {/* ── Phase 3 classrooms & student quizzes ──────────────────── */}
        <Route path="classrooms" element={<Classrooms />} />
        <Route path="learn" element={<Learn />} />
        <Route path="learn/quiz/:quizId" element={<QuizPlayer />} />
        {/* NB: /portal/plans is Lesson Plans (legacy name) — the SaaS
            pricing page lives at /portal/subscription. */}
        <Route path="subscription" element={<Plans />} />
        <Route path="billing" element={<Billing />} />
        <Route path="members" element={<Members />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
