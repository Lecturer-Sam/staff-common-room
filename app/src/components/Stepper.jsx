/**
 * Stepper — a horizontally scrollable progress map for multi-step forms.
 */
export default function Stepper({ steps, current, onStepClick }) {
  return (
    <ol className="hearth-stepper">
      {steps.map((step, index) => {
        const done = index < current
        const active = index === current
        const clickable = onStepClick && index <= current
        const stateClass = active ? ' is-active' : done ? ' is-done' : ''
        const marker = (
          <span className={`hearth-stepper__marker${stateClass}`}>
            {done ? (
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="3 8.5 6.5 12 13 4.5" />
              </svg>
            ) : (
              index + 1
            )}
          </span>
        )

        return (
          <li key={step.label} className="hearth-stepper__step">
            {clickable ? (
              <button
                type="button"
                onClick={() => onStepClick(index)}
                className={`hearth-stepper__target${stateClass}`}
              >
                {marker}
                <span className="hearth-stepper__label">{step.label}</span>
              </button>
            ) : (
              <span className={`hearth-stepper__target${stateClass}`}>
                {marker}
                <span className="hearth-stepper__label">{step.label}</span>
              </span>
            )}
            {index < steps.length - 1 && (
              <span className={`hearth-stepper__line${done ? ' is-done' : ''}`} />
            )}
          </li>
        )
      })}
    </ol>
  )
}
