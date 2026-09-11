import { Chip } from '../ui'
import OptionButton from './OptionButton'

const TYPE_LABEL = {
  mcq: 'Multiple choice', multi: 'Multiple answers', tf: 'True or false',
  num: 'Numeric', short: 'Short answer',
}

export default function QuestionCard({ question, given, onAnswer }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <Chip>{TYPE_LABEL[question.type]}</Chip>
        <Chip className="capitalize">{question.difficulty}</Chip>
      </div>
      <p className="text-base font-medium text-slate-900">{question.stem}</p>

      <div className="mt-4 space-y-2">
        {(question.type === 'mcq' || question.type === 'tf') &&
          question.options.map((opt, i) => (
            <OptionButton key={i} label={opt} selected={given === i} onSelect={() => onAnswer(i)} />
          ))}

        {question.type === 'multi' && (
          <>
            <p className="text-xs font-medium text-slate-400">Select all that apply</p>
            {question.options.map((opt, i) => {
              const selected = Array.isArray(given) && given.includes(i)
              return (
                <OptionButton key={i} label={opt} selected={selected} checkbox
                  onSelect={() => {
                    const base = Array.isArray(given) ? given : []
                    onAnswer(selected ? base.filter((x) => x !== i) : [...base, i].sort((a, b) => a - b))
                  }} />
              )
            })}
          </>
        )}

        {question.type === 'num' && (
          <input type="number" inputMode="decimal" step="any" placeholder="Type your answer…"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-lg outline-none focus:border-brand"
            value={given ?? ''}
            onChange={(e) => onAnswer(e.target.value === '' ? undefined : e.target.value)} />
        )}

        {question.type === 'short' && (
          <input type="text" placeholder="Type your answer…"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-brand"
            value={given ?? ''}
            onChange={(e) => onAnswer(e.target.value === '' ? undefined : e.target.value)} />
        )}
      </div>
    </div>
  )
}