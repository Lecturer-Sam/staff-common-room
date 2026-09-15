import QuestionCard from './QuestionCard'
import Timer from './Timer'
import FlagButton from './FlagButton'
import { useQuizStore } from '../../stores/quizStore'

export default function QuizPlayer({ onFinish }) {
  const session = useQuizStore()
  const { questions, current, answers, flags, standard } = session
  const question = questions[current]
  const isLast = current === questions.length - 1
  const answeredCount = questions.filter((q) => answers[q.id] !== undefined).length

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{standard.code}</p>
          <h1 className="font-bold text-slate-900">{standard.title}</h1>
        </div>
        <Timer />
      </div>

      <div>
        <div className="flex justify-between text-xs text-slate-500">
          <span>Question {current + 1} of {questions.length}</span>
          <span>{answeredCount}/{questions.length} answered</span>
        </div>
        <div className="mt-1 h-1.5 rounded-full bg-slate-200">
          <div className="h-1.5 rounded-full bg-brand transition-all"
            style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {questions.map((q, i) => {
          const answered = answers[q.id] !== undefined
          const flagged = flags.includes(q.id)
          return (
            <button key={q.id} onClick={() => session.goto(i)} aria-label={`Go to question ${i + 1}`}
              className={`h-8 w-8 rounded-lg text-xs font-semibold ${
                i === current ? 'bg-brand text-white'
                : flagged ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-300'
                : answered ? 'bg-brand/10 text-brand'
                : 'bg-white text-slate-400 ring-1 ring-slate-200'
              }`}>
              {i + 1}
            </button>
          )
        })}
      </div>

      <QuestionCard question={question} given={answers[question.id]}
        onAnswer={(v) => session.answer(question.id, v)} />

      <div className="flex items-center justify-between gap-3 pt-2">
        <button onClick={session.prev} disabled={current === 0}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 disabled:opacity-40">
          Back
        </button>
        <FlagButton flagged={flags.includes(question.id)} onToggle={() => session.toggleFlag(question.id)} />
        {isLast ? (
          <button onClick={onFinish} className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white">Finish</button>
        ) : (
          <button onClick={session.next} className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white">Next</button>
        )}
      </div>
    </div>
  )
}