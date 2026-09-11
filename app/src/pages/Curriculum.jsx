import { Link, useSearchParams } from 'react-router-dom'
import { useCurriculum, useGrades } from '../hooks/useCurriculum'
import { SkeletonGrid } from '../components/Skeleton'
import { getSubjectTheme } from '../lib/subjectThemes'
import SubjectIcon from '../components/SubjectIcon'
import { Card, Grid } from '../components/ui'

/* ── Subject card ───────────────────────────────────────────────────────── */
function SubjectCard({ subject, grade }) {
  const theme = getSubjectTheme(subject.id)
  const { counts } = subject

  return (
    <Card
      as={Link}
      to={`/portal/curriculum/${subject.id}?grade=${grade}`}
      className="group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
      banner={
        <div className="flex items-start justify-between gap-2">
          <h2 className="line-clamp-2 font-semibold leading-snug">{subject.name}</h2>
          <span className="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold">
            {subject.grade}
          </span>
        </div>
      }
    >
      {/* Icon + counts */}
      <div className="flex items-center gap-3">
        <SubjectIcon subjectId={subject.id} theme={theme} />
        <p className="card-meta">
          {counts.strands} strand{counts.strands === 1 ? '' : 's'} ·{' '}
          {counts.subStrands} sub-strand{counts.subStrands === 1 ? '' : 's'} ·{' '}
          {counts.indicators} indicator{counts.indicators === 1 ? '' : 's'}
        </p>
      </div>

      {/* Footer */}
      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
        {subject.hasSchedule && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-2 w-2" aria-hidden="true">
              <circle cx="8" cy="8" r="8" />
            </svg>
            Weekly scheme
          </span>
        )}
        <span className="ml-auto text-xs font-medium text-brand opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          Browse →
        </span>
      </div>
    </Card>
  )
}

/* ── Grade tab ──────────────────────────────────────────────────────────── */
function GradeTab({ id, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-indigo-600 text-white shadow-sm'
          : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      {id}
    </button>
  )
}

/* ── Page ───────────────────────────────────────────────────────────────── */
export default function Curriculum() {
  const grades = useGrades()
  const [searchParams, setSearchParams] = useSearchParams()
  const grade = searchParams.get('grade') || 'B1'
  const { subjects, loading } = useCurriculum(grade)
  const gradeMeta = grades.find((g) => g.id === grade)

  function setGrade(id) {
    const next = new URLSearchParams(searchParams)
    if (id === 'B1') next.delete('grade')
    else next.set('grade', id)
    setSearchParams(next)
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="page-title">NaCCA Curriculum</h1>
        <p className="page-subtitle">
          Browse strands, sub-strands, content standards and indicators — {gradeMeta?.name ?? grade}.
        </p>
      </div>

      {/* Grade tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {grades.map((g) => (
          <GradeTab
            key={g.id}
            id={g.id}
            active={grade === g.id}
            onClick={() => setGrade(g.id)}
          />
        ))}
      </div>

      {/* Partial data notice */}
      {grade !== 'B1' && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
          </svg>
          <span>
            <strong>{gradeMeta?.name}:</strong> curriculum structure is extracted — full indicator descriptions are still being added.
          </span>
        </div>
      )}

      {/* Subject grid */}
      {loading ? (
        <SkeletonGrid count={8} />
      ) : (
        <Grid>
          {subjects.map((s) => (
            <SubjectCard key={s.id} subject={s} grade={grade} />
          ))}
        </Grid>
      )}
    </div>
  )
}
