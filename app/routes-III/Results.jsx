import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { useAuth } from '../contexts/AuthContext'
import { useAttempts } from '../lib/attemptsService'
import { getQuestionsForStandard } from '../db/aggregate'
import { Loading, ErrorCard } from '../components/ui'

export default function Results() {
  const { attemptId } = useParams()
  const location = useLocation()
  const { user } = useAuth()
  const { attempts, loading, error } = useAttempts(user?.uid)

  // Prefer the attempt handed over by Quiz (no re-query).
  // The subscription is the fallback when the page is reloaded.
  const attempt = location.state?.attempt ?? attempts.find((a) => a.id === attemptId)

  const [questions, setQuestions] = useState([])

  useEffect(() => {
    if (!attempt) return undefined
    let on = true
    getQuestionsForStandard(attempt.standardId)
      .then((qs) => on && setQuestions(qs))
      .catch((err) => console.error('[results] questions load failed:', err))
    return () => {
      on = false
    }
  }, [attempt?.standardId])

  if (error) {
    return <ErrorCard title="Couldn't load your attempt" detail={error.message} />
  }
  if (!attempt) {
    return loading ? (
      <Loading />
    ) : (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <p className="font-semibold text-slate-900">We couldn't find that attempt.</p>
        <Link to="/progress" className="mt-2 inline-block font-semibold text-brand">
          View your progress
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link to={`/standards/${standard.strandId}/${standard.subStrandId}`}
          className="flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-brand">
          <ArrowLeft size={14} /> {subject.name}
        </Link>
        <Link to={`/quiz/${standard.id}`}
          className="flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
          <RotateCcw size={14} /> Retake
        </Link>
      </div>

      <h1 className="text-xl font-bold text-slate-900">{standard.title}</h1>

      <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-6">
        <ScoreRing percent={breakdown.percent} />
        <p className="text-sm text-slate-500">
          {attempt.score} of {attempt.total} correct · {fmtTime(attempt.timeSeconds)}
        </p>
      </div>

      <StrandBreakdown byDifficulty={breakdown.byDifficulty} />
      <WeakAreas weakTags={breakdown.weakTags} />

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-500">
          {breakdown.missed.length ? `Review (${breakdown.missed.length} missed)` : 'Perfect score — nothing to review'}
        </h2>
        <div className="mt-3 space-y-4">
          {breakdown.missed.map(({ question: q, given }) => (
            <div key={q.id} className="rounded-xl border border-slate-100 p-3 text-sm">
              <p className="font-medium text-slate-800">{q.stem}</p>
              <p className="mt-2 text-red-600">Your answer: {displayGiven(q, given)}</p>
              <p className="text-green-700">Correct: {displayAnswer(q)}</p>
              <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">{q.explanation}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}