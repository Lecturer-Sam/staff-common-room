import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useCurriculum, buildTree, isPlaceholder, useGrades } from '../hooks/useCurriculum'
import { getSubjectTheme } from '../lib/subjectThemes'
import SubjectIcon from '../components/SubjectIcon'

function Detail({ label, value }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
        {label}
      </dt>
      <dd className="text-sm text-slate-600">{value}</dd>
    </div>
  )
}

function Indicator({ ind }) {
  const [expanded, setExpanded] = useState(false)
  const hasExemplars = ind.exemplars?.length > 0
  const hasDetails =
    ind.competencies ||
    ind.resources ||
    ind.keywords ||
    ind.assessment ||
    hasExemplars

  return (
    <li className="rounded-md border border-slate-100 bg-slate-50 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm text-slate-700">
          <span className="mr-2 font-mono text-xs font-semibold text-indigo-700">
            {ind.code}
          </span>
          {isPlaceholder(ind.description) ? (
            <em className="text-slate-400">(description pending extraction)</em>
          ) : (
            ind.description
          )}
        </p>
        <span className="flex shrink-0 gap-2">
          {hasDetails && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="text-xs font-medium text-slate-500 hover:text-indigo-600 hover:underline"
            >
              {expanded ? 'Hide details' : 'Details'}
            </button>
          )}
          <Link
            to={`/portal/plans?indicator=${encodeURIComponent(ind.id)}`}
            className="text-xs font-medium text-indigo-600 hover:underline"
          >
            Lesson plans
          </Link>
          <Link
            to={`/portal/plans/new?subject=${ind.subjectId}&indicator=${encodeURIComponent(ind.id)}`}
            className="text-xs font-medium text-amber-600 hover:underline"
          >
            + New plan
          </Link>
        </span>
      </div>
      {expanded && (
        <dl className="mt-3 space-y-2 border-t border-slate-200 pt-3">
          {hasExemplars && (
            <div>
              <dt className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                Exemplars
              </dt>
              <dd>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-slate-600">
                  {ind.exemplars.map((ex, i) => (
                    <li key={i} className="whitespace-pre-line">
                      {ex}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          )}
          <Detail label="Core competencies" value={ind.competencies} />
          <Detail label="T/L resources" value={ind.resources} />
          <Detail label="Keywords" value={ind.keywords} />
          <Detail label="Assessment" value={ind.assessment} />
        </dl>
      )}
    </li>
  )
}

export default function SubjectBrowser() {
  const { subjectId } = useParams()
  const [searchParams] = useSearchParams()
  const grade = searchParams.get('grade') || 'B1'
  const grades = useGrades()
  const gradeName = grades.find((g) => g.id === grade)?.name ?? grade
  const { subjects, indicators, loading } = useCurriculum(grade)
  const [open, setOpen] = useState({})

  const subject = subjects.find((s) => s.id === subjectId)
  const tree = useMemo(
    () => buildTree(indicators, subjectId),
    [indicators, subjectId],
  )

  if (loading) return <p className="text-slate-400">Loading curriculum…</p>
  if (!subject) return <p className="text-slate-500">Subject not found.</p>

  const theme = getSubjectTheme(subjectId)
  const toggle = (key) => setOpen((o) => ({ ...o, [key]: !o[key] }))

  return (
    <div>
      <nav className="mb-3 text-sm text-slate-500">
        <Link
          to={`/portal/curriculum${grade !== 'B1' ? `?grade=${grade}` : ''}`}
          className="text-brand hover:underline"
        >
          Curriculum
        </Link>{' '}
        / {subject.name}
      </nav>

      {/* Subject header with color accent */}
      <div className="card mb-6 flex items-center gap-4 p-5">
        <SubjectIcon subjectId={subjectId} theme={theme} size="lg" />
        <div className="min-w-0">
          <h1 className="page-title">
            {subject.name}
            <span className="ml-2 text-base font-normal text-slate-400">· {gradeName}</span>
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${theme.accent} ${theme.text}`}>
              {subject.counts.strands} strands
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${theme.accent} ${theme.text}`}>
              {subject.counts.indicators} indicators
            </span>
            {subject.hasSchedule && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                Weekly scheme
              </span>
            )}
            <a
              href={subject.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="ml-auto text-xs text-slate-400 hover:text-indigo-600 hover:underline"
            >
              NaCCA PDF ↗
            </a>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {tree.map((strand) => (
          <section key={strand.number} className="card">
            <button
              type="button"
              onClick={() => toggle(`s${strand.number}`)}
              className="flex w-full items-center justify-between px-5 py-4 text-left"
            >
              <h2 className="font-semibold text-slate-900">
                Strand {strand.number}: {strand.name}
              </h2>
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition-colors ${open[`s${strand.number}`] ? 'bg-slate-100' : 'hover:bg-slate-50'}`}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-3.5 w-3.5 transition-transform ${open[`s${strand.number}`] ? 'rotate-180' : ''}`}>
                  <polyline points="4 6 8 10 12 6" />
                </svg>
              </span>
            </button>
            {open[`s${strand.number}`] && (
              <div className="space-y-4 border-t border-slate-100 px-5 py-4">
                {strand.subStrands.map((ss) => (
                  <div key={ss.number}>
                    <h3 className="mb-2 text-sm font-semibold text-slate-700">
                      Sub-strand {ss.number}: {ss.name}
                    </h3>
                    <div className="space-y-3 pl-3">
                      {ss.standards.map((std) => (
                        <div key={std.code}>
                          <p className="mb-1.5 text-sm text-slate-600">
                            <span className="mr-1.5 font-mono text-xs font-semibold text-slate-500">
                              {std.code}
                            </span>
                            {std.description || <em>(not coded in PDF)</em>}
                          </p>
                          <ul className="space-y-1.5">
                            {std.indicators.map((ind) => (
                              <Indicator key={ind.id} ind={ind} />
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
