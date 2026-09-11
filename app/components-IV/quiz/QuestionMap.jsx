/**
 * Grid of dots — one per question.
 * States: current (navy), answered (accent), flagged badge, unanswered (slate).
 *
 * Props:
 *   questions  — array of question objects
 *   answers    — { [questionId]: given }
 *   flagged    — Set of questionIds
 *   current    — index of currently displayed question
 *   onGoTo(i)  — jump to question index i
 */
export default function QuestionMap({ questions, answers, flagged, current, onGoTo }) {
  return (
    <div className="px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
        Question Map
      </p>
      <div className="flex flex-wrap gap-2">
        {questions.map((q, i) => {
          const isCurrent  = i === current
          const isAnswered = answers[q.id] !== undefined
          const isFlagged  = flagged.has(q.id)

          return (
            <button
              key={q.id}
              onClick={() => onGoTo(i)}
              aria-label={`Question ${i + 1}`}
              className={`relative h-9 w-9 rounded-xl text-[12px] font-bold
                          border-2 transition-all active:scale-90
                          ${isCurrent
                            ? 'bg-navy text-accent border-navy shadow-md scale-105'
                            : isAnswered
                            ? 'bg-accent/20 text-navy border-accent/40'
                            : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}
            >
              {i + 1}
              {/* Flag dot */}
              {isFlagged && (
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full
                                 bg-pending border-2 border-white" />
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-[10px] font-medium text-slate-400">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded bg-navy inline-block" />Current
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded bg-accent/40 inline-block" />Answered
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-pending inline-block" />Flagged
        </span>
      </div>
    </div>
  )
}
