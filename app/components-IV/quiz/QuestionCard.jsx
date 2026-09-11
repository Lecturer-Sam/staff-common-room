import { useState } from 'react'
import { Lightbulb } from 'lucide-react'
import OptionButton from './OptionButton'

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F']

/**
 * Renders the question stem and the appropriate input control for each
 * question type. Shows an explanation panel once the user has answered.
 *
 * Props:
 *   question   — full question object from Dexie
 *   given      — the user's current answer (undefined = unanswered)
 *   revealed   — boolean, show correct/wrong indicators
 *   onAnswer(given) — called when user submits an answer
 */
export default function QuestionCard({ question, given, revealed, onAnswer }) {
  const { type, stem, options, answer, explanation } = question

  // ── MCQ / TF ─────────────────────────────────────────────────────────────
  if (type === 'mcq' || type === 'tf') {
    return (
      <div className="space-y-3">
        <Stem text={stem} code={question.id} difficulty={question.difficulty} />

        <div className="space-y-2.5">
          {options.map((opt, i) => (
            <OptionButton
              key={i}
              label={LABELS[i]}
              text={opt}
              selected={given === i}
              revealed={revealed}
              isCorrect={answer === i}
              onClick={() => !revealed && onAnswer(i)}
              disabled={revealed}
            />
          ))}
        </div>

        {revealed && <Explanation text={explanation} />}
      </div>
    )
  }

  // ── MULTI-SELECT ──────────────────────────────────────────────────────────
  if (type === 'multi') {
    const chosen = Array.isArray(given) ? given : []

    const toggle = (i) => {
      if (revealed) return
      const next = chosen.includes(i)
        ? chosen.filter((x) => x !== i)
        : [...chosen, i]
      onAnswer(next)
    }

    return (
      <div className="space-y-3">
        <Stem text={stem} code={question.id} difficulty={question.difficulty} />
        <p className="text-[11px] text-slate-400 font-medium -mt-1">
          Select all that apply
        </p>

        <div className="space-y-2.5">
          {options.map((opt, i) => (
            <OptionButton
              key={i}
              label={LABELS[i]}
              text={opt}
              selected={chosen.includes(i)}
              revealed={revealed}
              isCorrect={Array.isArray(answer) && answer.includes(i)}
              onClick={() => toggle(i)}
              disabled={revealed}
            />
          ))}
        </div>

        {revealed && <Explanation text={explanation} />}
      </div>
    )
  }

  // ── NUMERIC ───────────────────────────────────────────────────────────────
  if (type === 'num') {
    return (
      <NumericCard
        question={question}
        given={given}
        revealed={revealed}
        onAnswer={onAnswer}
      />
    )
  }

  // ── SHORT ANSWER ──────────────────────────────────────────────────────────
  if (type === 'short') {
    return (
      <ShortCard
        question={question}
        given={given}
        revealed={revealed}
        onAnswer={onAnswer}
      />
    )
  }

  // Fallback
  return <Stem text={stem} code={question.id} difficulty={question.difficulty} />
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function Stem({ text, code, difficulty }) {
  const diffColour = {
    easy:   'bg-emerald-50 text-emerald-700',
    medium: 'bg-amber-50   text-amber-700',
    hard:   'bg-red-50     text-red-600',
  }[difficulty] ?? 'bg-slate-100 text-slate-500'

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-extrabold font-mono px-2 py-0.5
                         rounded-full bg-navy text-accent">
          {code.split('-').slice(-1)[0].toUpperCase()}
        </span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize
                          ${diffColour}`}>
          {difficulty}
        </span>
      </div>
      <p className="text-[15px] font-semibold text-navy leading-snug">{text}</p>
    </div>
  )
}

function Explanation({ text }) {
  if (!text) return null
  return (
    <div className="rounded-[12px] bg-slate-50 border border-slate-200 p-3.5 mt-1">
      <div className="flex items-center gap-1.5 text-[11px] font-bold
                      text-slate-500 uppercase tracking-wide mb-1.5">
        <Lightbulb size={12} />
        Explanation
      </div>
      <p className="text-[13px] text-slate-600 leading-relaxed">{text}</p>
    </div>
  )
}

function NumericCard({ question, given, revealed, onAnswer }) {
  const [draft, setDraft] = useState(given !== undefined ? String(given) : '')

  const isCorrect = revealed && Number(draft) === question.answer

  const submit = () => {
    const val = parseFloat(draft)
    if (!isNaN(val)) onAnswer(val)
  }

  return (
    <div className="space-y-3">
      <Stem text={question.stem} code={question.id} difficulty={question.difficulty} />

      <div className="flex gap-2">
        <input
          type="number"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={submit}
          disabled={revealed}
          placeholder="Enter your answer"
          className={`flex-1 h-12 rounded-[12px] border-2 px-4
                      text-[15px] font-semibold text-navy
                      focus:outline-none focus:border-navy
                      disabled:opacity-60
                      ${revealed
                        ? isCorrect
                          ? 'border-correct bg-emerald-50'
                          : 'border-wrong bg-red-50'
                        : 'border-slate-200 bg-white'}`}
        />
        {!revealed && (
          <button
            onClick={submit}
            disabled={draft === ''}
            className="h-12 px-5 rounded-[12px] bg-navy text-accent
                       font-bold text-[13px] disabled:opacity-40
                       active:scale-95 transition-transform"
          >
            Check
          </button>
        )}
      </div>

      {revealed && (
        <p className={`text-[13px] font-semibold ${isCorrect ? 'text-correct' : 'text-wrong'}`}>
          {isCorrect ? '✓ Correct!' : `✗ Answer: ${question.answer}`}
        </p>
      )}

      {revealed && <Explanation text={question.explanation} />}
    </div>
  )
}

function ShortCard({ question, given, revealed, onAnswer }) {
  const [draft, setDraft] = useState(given !== undefined ? String(given) : '')

  // Short answers are validated as case-insensitive match against any accepted value
  const accepted = Array.isArray(question.answer) ? question.answer : [question.answer]
  const isCorrect = revealed &&
    accepted.some((a) => a.toLowerCase() === draft.trim().toLowerCase())

  return (
    <div className="space-y-3">
      <Stem text={question.stem} code={question.id} difficulty={question.difficulty} />

      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => draft.trim() && onAnswer(draft.trim())}
          disabled={revealed}
          placeholder="Type your answer…"
          className={`flex-1 h-12 rounded-[12px] border-2 px-4
                      text-[15px] font-semibold text-navy
                      focus:outline-none focus:border-navy
                      disabled:opacity-60
                      ${revealed
                        ? isCorrect
                          ? 'border-correct bg-emerald-50'
                          : 'border-wrong   bg-red-50'
                        : 'border-slate-200 bg-white'}`}
        />
        {!revealed && (
          <button
            onClick={() => draft.trim() && onAnswer(draft.trim())}
            disabled={!draft.trim()}
            className="h-12 px-5 rounded-[12px] bg-navy text-accent
                       font-bold text-[13px] disabled:opacity-40
                       active:scale-95 transition-transform"
          >
            Check
          </button>
        )}
      </div>

      {revealed && (
        <p className={`text-[13px] font-semibold ${isCorrect ? 'text-correct' : 'text-wrong'}`}>
          {isCorrect ? '✓ Correct!' : `✗ Accepted: ${accepted.join(' / ')}`}
        </p>
      )}

      {revealed && <Explanation text={question.explanation} />}
    </div>
  )
}
