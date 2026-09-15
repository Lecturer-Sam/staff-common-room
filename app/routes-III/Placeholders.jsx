import { Link, useParams } from 'react-router'

function Placeholder({ text }) {
  return <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">{text}</p>
}

export function QuizPlaceholder() {
  const { standardId } = useParams()
  return <Placeholder text={`Quiz engine for ${standardId} — arrives in Stage 2c`} />
}

export function ProgressPlaceholder() {
  return <Placeholder text="Progress & analytics — Stage 2c" />
}

export function MorePlaceholder() {
  return <Placeholder text="Settings, data manager & account — Stages 3–4" />
}

export function NotFound() {
  return (
    <div className="py-16 text-center text-slate-500">
      <p className="text-4xl font-bold text-slate-300">404</p>
      <p className="mt-2 text-sm">That page doesn't exist.</p>
      <Link to="/" className="mt-4 inline-block font-semibold text-brand underline">Go home</Link>
    </div>
  )
}