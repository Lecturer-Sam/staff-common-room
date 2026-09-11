import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Play } from 'lucide-react'
import { db } from '../db/dexie'
import { useLoader } from '../lib/useLoader'
import { useQuizStore } from '../stores/quizStore'
import { gradeSession } from '../lib/grading'
import { Card, Loading, ErrorCard, Chip } from '../components/ui'
import BreadcrumbStepper from '../components/layout/BreadcrumbStepper'
import QuizPlayer from '../components/quiz/QuizPlayer'
import { saveAttempt } from '../lib/attemptsService'

export default function Quiz() {
  const { standardId } = useParams()
  const navigate = useNavigate()
  const session = useQuizStore()
  const [fatal, setFatal] = useState(null)

  const { data, error, reload } = useLoader(async () => {
    const standard = await db.contentStandards.get(standardId)
    if (!standard) throw new Error('Unknown standard')
    const [subject, klass, strand, subStrand, questions] = await Promise.all([
      db.subjects.get(standard.subjectId),
      db.classes.get(standard.classId),
      db.strands.get(standard.strandId),
      db.subStrands.get(standard.subStrandId),
      db.questions.where('csId').equals(standardId).toArray(),
    ])
    if (questions.length === 0) throw new Error('No questions published for this standard yet')
    return { standard, subject, klass, strand, subStrand, questions }
  }, [standardId])


    const finish = async () => {
    const s = useQuizStore.getState()
    const unanswered = s.questions.filter((q) => s.answers[q.id] === undefined).length
    if (unanswered > 0 && !window.confirm(`${unanswered} question(s) unanswered. Finish anyway?`)) return
    const { score, total, detail } = gradeSession(s.questions, s.answers)
    
    const attempt = {
      standardId: s.standard.id,
      subjectId: s.standard.subjectId,
      classId: s.standard.classId,
      score,
      total,
      timeSeconds: s.elapsed,
      answers: detail,
      date: new Date().toLocaleDateString('en-CA'),
    }
    try {
      const saved = await saveAttempt(user.uid, attempt)
      s.clearSession()
      navigate(`/results/${saved.id}`, { replace: true, state: { attempt: saved } })
    } catch (err) {
      console.error('[quiz] save failed:', err)
      setFatal("Couldn't save your attempt. Your answers are safe — press Try again.")
    }
  }



  if (error) return <ErrorCard error={error} onRetry={reload} />
  if (!data) return <Loading />
  const { standard, subject, klass, strand, subStrand, questions } = data

  const trail = [
    { label: 'Home', to: '/' },
    { label: klass.name, to: `/subjects/${klass.id}` },
    { label: subject.name, to: `/strands/${klass.id}/${subject.id}` },
    { label: strand.name, to: `/sub-stands/${strand.id}` },
    { label: subStrand.name, to: `/standards/${strand.id}/${subStrand.id}` },
    { label: standard.code },
  ]

  // Session for a DIFFERENT standard is in flight
  if (session.phase === 'active' && session.standard.id !== standardId) {
    return (
      <div className="space-y-4">
        <BreadcrumbStepper trail={trail} />
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-slate-700">
          <p>You have an in-progress quiz on <strong>{session.standard.title}</strong>.</p>
          <div className="mt-3 flex gap-2">
            <Link to={`/quiz/${session.standard.id}`}
              className="rounded-xl bg-brand px-4 py-2 font-semibold text-white">Resume it</Link>
            <button onClick={session.clearSession}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-600">Discard</button>
          </div>
        </div>
      </div>
    )
  }

  // Session for THIS standard — resume the player
  if (session.phase === 'active' && session.standard.id === standardId) {
    return <QuizPlayer onFinish={finish} />
  }

  // Fresh start screen
  const mix = questions.reduce((m, q) => ((m[q.difficulty] = (m[q.difficulty] ?? 0) + 1), m), {})
  return (
    <div className="space-y-4">
      <BreadcrumbStepper trail={trail} />
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{standard.title}</h1>
        <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: subject.colour }} />
          {subject.name} · {standard.code}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Chip>{questions.length} questions</Chip>
        {Object.entries(mix).map(([k, n]) => <Chip key={k}>{n} {k}</Chip>)}
        <Chip>~{questions.length} min</Chip>
      </div>
      <button
        onClick={() => session.start(
          {
            id: standard.id, code: standard.code, title: standard.title,
            subjectId: standard.subjectId, classId: standard.classId,
            subjectName: subject.name, subjectColour: subject.colour,
          },
          questions,
        )}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-3 font-semibold text-white shadow-sm transition hover:opacity-90">
        <Play size={18} /> Begin
      </button>
    </div>
  )
}