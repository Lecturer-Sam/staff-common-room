import { createBrowserRouter } from 'react-router-dom'
import AppShell        from './components/layout/AppShell'
import LearnerPath     from './routes/LearnerPath'
import QuizPlayer      from './routes/QuizPlayer'
import ResultsInsights from './routes/ResultsInsights'
import DataManager     from './routes/DataManager'
import PwaShell        from './routes/PwaShell'
import Results         from './routes/Results'

/**
 * Route tree (5-tab design per the mockups).
 *
 * Tab labels:
 *   01 Learner Path     → /                       LearnerPath.jsx
 *   02 Quiz Player      → /quiz-player            QuizPlayer.jsx
 *   03 Results&Insights → /results-insights       ResultsInsights.jsx
 *   04 Data Manager     → /data-manager           DataManager.jsx
 *   05 PWA Shell        → /pwa-shell              PwaShell.jsx
 *   (post-quiz summary) → /results                Results.jsx   (not a tab)
 *
 * AppShell is the root layout — it renders the header (with optional
 * desktop numbered tab bar), sticky bottom nav, and an <Outlet> where
 * each child route mounts.
 */
const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true,                 element: <LearnerPath />     },
      { path: 'quiz-player',         element: <QuizPlayer />      },
      { path: 'results-insights',    element: <ResultsInsights /> },
      { path: 'data-manager',        element: <DataManager />     },
      { path: 'pwa-shell',           element: <PwaShell />        },
      { path: 'results',             element: <Results />         },
    ],
  },
])

export default router
