import { Routes, Route } from 'react-router'
import AppShell from './components/layout/AppShell'
import Home from './routes/Home'
import { SubjectLevel, StrandLevel, SubStrandLevel, StandardsLevel, StandardDetail } from './routes/Drilldown'
import Quiz from './routes/Quiz'
import Results from './routes/Results'
import Progress from './routes/Progress'
import More from './routes/More'
import Auth from './routes/Auth'
import RequireAuth from './components/auth/RequireAuth'
import { NotFound } from './routes/Placeholders'

export default function App() {
  return (
    <Routes>
      <Route path="auth" element={<Auth />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<Home />} />
          <Route path="subjects/:classId" element={<SubjectLevel />} />
          <Route path="strands/:classId/:subjectId" element={<StrandLevel />} />
          <Route path="sub-stands/:strandId" element={<SubStrandLevel />} />
          <Route path="standards/:strandId/:subStrandId" element={<StandardsLevel />} />
          <Route path="standards/:strandId/:subStrandId/:standardId" element={<StandardDetail />} />
          <Route path="quiz/:standardId" element={<Quiz />} />
          <Route path="results/:attemptId" element={<Results />} />
          <Route path="progress" element={<Progress />} />
          <Route path="more" element={<More />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}