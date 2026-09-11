import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, SendHorizonal } from 'lucide-react'
import db from '../../db/db'
import useQuizStore from '../../stores/quizStore'
import useOfflineStore from '../../stores/offlineStore'
import Timer from './Timer'
import FlagButton from './FlagButton'
import QuestionMap from './QuestionMap'
import QuestionCard from './QuestionCard'

/**
 * Full quiz session container.
 * Reads everything from quizStore — no local session state.
 */
export default function QuizPlayer() {
  const navigate   = useNavigate()
  const timerRef   = useRef(0)            // latest elapsed seconds from Timer

  const {
    questions, current, answers, flagged,
    answer, toggleFlag, goTo, next, prev, finishQuiz, resetQuiz,
  } = useQuizStore()

  const enqueue    = useOfflineStore((s) => s.enqueue)
  const isOnline   = useOfflineStore((s) => s.isOnline)

  const [showMap,    setShowMap]    = useState(false)
  const [showSubmit, setShowSubmit] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const question   = questions[current]
  const totalQ     = questions.length
  const answeredN  = Object.keys(answers).length
  const isFlagged  = flagged.has(question?.id)

  // Progress: answered / total
  const progress = totalQ > 0 ? (answeredN / totalQ) * 100 : 0

  // After answering an MCQ/TF auto-reveal then auto-advance after 1.2s
  const handleAnswer = (given) => {
    answer(question.id, given)
  }

  // Whether this question has been answered
  const isAnswered = answers[question?.id] !== undefined

  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)

    const attempt = finishQuiz()

    // Persist attempt to Dexie
    try {
      await db.attempts.add(attempt)
    } catch {
      // If Dexie fails (e.g. quota), fall through to offline queue
    }

    // If offline, also queue for later sync
    if (!isOnline) {
      enqueue(attempt)
    }

    resetQuiz()
    navigate('/results', { state: { attempt } })
  }

  if (!question) return null

  return (
    <div className="flex flex-col min-h-full">

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-surface/95 backdrop-blur-sm
                      border-b border-slate-200 px-4 py-2.5 space-y-2">

        {/* Row 1: counter · timer · flag */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold text-slate-500">
              Q {current + 1} / {totalQ}
            </span>
            <button
              onClick={() => setShowMap((v) => !v)}
              className="text-[11px] font-semibold text-navy underline underline-offset-2"
            >
              {showMap ? 'Hide map' : 'Show map'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <FlagButton
              flagged={isFlagged}
              onToggle={() => toggleFlag(question.id)}
            />
            <Timer onTick={(s) => { timerRef.current = s }} />
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Question map (collapsible) */}
        {showMap && (
          <QuestionMap
            questions={questions}
            answers={answers}
            flagged={flagged}
            current={current}
            onGoTo={(i) => { goTo(i); setShowMap(false) }}
          />
        )}
      </div>

      {/* ── Question ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <QuestionCard
          question={question}
          given={answers[question.id]}
          revealed={isAnswered}
          onAnswer={handleAnswer}
        />
      </div>

      {/* ── Submit confirmation banner ───────────────────────────────────── */}
      {showSubmit && (
        <div className="mx-4 mb-2 rounded-[14px] bg-navy text-white p-4">
          <p className="text-[13px] font-semibold">
            Submit quiz? {answeredN < totalQ && (
              <span className="text-pending">
                {totalQ - answeredN} question{totalQ - answeredN !== 1 ? 's' : ''} unanswered.
              </span>
            )}
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setShowSubmit(false)}
              className="flex-1 h-10 rounded-full border border-white/20
                         text-[13px] font-semibold hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 h-10 rounded-full bg-accent text-navy
                         text-[13px] font-bold disabled:opacity-50
                         active:scale-95 transition-transform"
            >
              {submitting ? 'Saving…' : 'Confirm'}
            </button>
          </div>
        </div>
      )}

      {/* ── Bottom nav buttons ───────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3
                      border-t border-slate-200 bg-white">
        <button
          onClick={prev}
          disabled={current === 0}
          aria-label="Previous question"
          className="h-11 w-11 rounded-full border-2 border-slate-200
                     flex items-center justify-center text-slate-500
                     disabled:opacity-30 active:scale-95 transition-all
                     hover:border-navy hover:text-navy"
        >
          <ChevronLeft size={20} />
        </button>

        {current < totalQ - 1 ? (
          <button
            onClick={next}
            className="flex-1 h-11 rounded-full bg-navy text-accent
                       font-bold text-[14px] flex items-center justify-center gap-2
                       active:scale-[0.98] transition-transform"
          >
            Next <ChevronRight size={18} />
          </button>
        ) : (
          <button
            onClick={() => setShowSubmit(true)}
            className="flex-1 h-11 rounded-full bg-accent text-navy
                       font-bold text-[14px] flex items-center justify-center gap-2
                       active:scale-[0.98] transition-transform"
          >
            Finish Quiz <SendHorizonal size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
