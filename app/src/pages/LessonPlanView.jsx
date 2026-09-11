import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteDoc, doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useCurriculum } from '../hooks/useCurriculum'
import { gradeLabel } from '../lib/grades'
import ConfirmModal from '../components/ConfirmModal'
import RequestDeliveryModal from '../components/RequestDeliveryModal'
import { useToast } from '../context/ToastContext'
import useExportGate from '../hooks/useExportGate'

const cell = 'border border-slate-300 px-3 py-2 align-top text-xs'
const lbl = 'mr-1 font-semibold text-slate-500'

function HCell({ label, value, className = '' }) {
  return (
    <td className={`${cell} ${className}`}>
      <span className={lbl}>{label}:</span>
      <span className="whitespace-pre-line text-slate-700">{value || '—'}</span>
    </td>
  )
}

export default function LessonPlanView() {
  const { planId } = useParams()
  const { user, profile, isOwner } = useAuth()
  const { subjects, indicators } = useCurriculum()
  const [plan, setPlan] = useState(undefined)
  const [downloading, setDownloading] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [requesting, setRequesting] = useState(false)
  const toast = useToast()
  const gate = useExportGate()
  const navigate = useNavigate()

  useEffect(() => {
    getDoc(doc(db, 'lesson_plans', planId)).then((snap) =>
      setPlan(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    )
  }, [planId])

  if (plan === undefined) return <p className="text-slate-400">Loading…</p>
  if (plan === null)
    return <p className="text-slate-500">Lesson plan not found.</p>

  const isAuthor = user?.uid === plan.authorId
  const isAdmin = profile?.role === 'admin'
  const subject = subjects.find((s) => s.id === plan.subjectId)
  const subjectName = subject?.name ?? plan.subjectId
  const isV2 = plan.kind === 'plan-v2'
  const H = plan.header ?? {}

  function handleDelete() {
    setConfirm({
      title: 'Delete this lesson plan?',
      body: 'This cannot be undone.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'lesson_plans', plan.id))
          toast.success('Lesson plan deleted.')
          navigate('/portal/plans')
        } catch {
          toast.error('Failed to delete lesson plan.')
        }
      },
    })
  }

  // Agents get a watermarked preview; the owner gets the clean, deliverable file.
  async function handleDownload(format, { preview = false } = {}) {
    const key = `${preview ? 'preview' : 'clean'}-${format}`
    setDownloading(key)
    const args = {
      subjectName,
      gradeLabel: gradeLabel(plan.grade),
      term: plan.term,
      week: plan.week,
      header: plan.header,
      days: plan.days,
      authorName: plan.authorName,
      watermark: preview,
    }
    try {
      // Clean downloads count against the free-tier quota; watermarked
      // agent previews are exempt (see useExportGate).
      await gate(async () => {
        if (format === 'docx') {
          const { downloadLessonPlanDocx } = await import('../lib/lessonPlanDocx')
          await downloadLessonPlanDocx(args)
        } else {
          const { downloadLessonPlanPdf } = await import('../lib/lessonPlanPdf')
          await downloadLessonPlanPdf(args)
        }
      }, { preview })
    } finally {
      setDownloading('')
    }
  }

  return (
    <div className={isV2 ? '' : 'mx-auto max-w-2xl'}>
      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />
      {requesting && (
        <RequestDeliveryModal
          materialType="lesson_plan"
          materialRef={{ collection: 'lesson_plans', id: plan.id }}
          materialTitle={plan.title}
          onClose={() => setRequesting(false)}
        />
      )}
      <nav className="mb-2 text-sm text-slate-500">
        <Link to="/portal/plans" className="text-indigo-600 hover:underline">
          Lesson Plans
        </Link>{' '}
        / {plan.title}
      </nav>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">{plan.title}</h1>
          <p className="page-subtitle">
            {subjectName} · {plan.grade} · by {plan.authorName}
            {plan.visibility === 'private' && ' · Private'}
            {plan.createdAt?.toDate &&
              ` · ${plan.createdAt.toDate().toLocaleDateString()}`}
          </p>
        </div>
        <span className="flex flex-wrap justify-end gap-2">
          {isV2 && (
            <Link
              to={`/portal/plans/new?from=${plan.id}`}
              className="rounded-md border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
            >
              Use as template
            </Link>
          )}
          {isV2 && isOwner && (
            <>
              <button
                type="button"
                onClick={() => handleDownload('pdf')}
                disabled={!!downloading}
                className="rounded-md bg-amber-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
              >
                {downloading === 'clean-pdf' ? 'Preparing…' : 'Download PDF'}
              </button>
              <button
                type="button"
                onClick={() => handleDownload('docx')}
                disabled={!!downloading}
                className="rounded-md bg-sky-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
              >
                {downloading === 'clean-docx' ? 'Preparing…' : 'Download Word'}
              </button>
            </>
          )}
          {isV2 && !isOwner && (
            <>
              <button
                type="button"
                onClick={() => setRequesting(true)}
                className="rounded-md bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-hover"
              >
                Request delivery
              </button>
              <button
                type="button"
                onClick={() => handleDownload('pdf', { preview: true })}
                disabled={!!downloading}
                className="rounded-md border border-amber-300 bg-amber-50 px-4 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
              >
                {downloading === 'preview-pdf' ? 'Preparing…' : 'Preview PDF'}
              </button>
              <button
                type="button"
                onClick={() => handleDownload('docx', { preview: true })}
                disabled={!!downloading}
                className="rounded-md border border-sky-300 bg-sky-50 px-4 py-1.5 text-sm font-medium text-sky-700 hover:bg-sky-100 disabled:opacity-50"
              >
                {downloading === 'preview-docx' ? 'Preparing…' : 'Preview Word'}
              </button>
            </>
          )}
          {(isAuthor || isAdmin) && (
            <>
              <Link
                to={`/portal/plans/${plan.id}/edit`}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
              >
                Edit
              </Link>
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </>
          )}
        </span>
      </div>

      {!isV2 ? (
        /* Legacy free-text plan */
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm leading-relaxed whitespace-pre-wrap text-slate-700">
            {plan.content}
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Branded document header */}
          <div className="border-b border-slate-200 px-6 py-5 text-center">
            <img
              src="/beaconlogo.png"
              alt="Beacon Educational Consult"
              className="mx-auto mb-2 h-14 w-14 object-contain"
            />
            <p className="text-base font-extrabold tracking-wide text-slate-900 uppercase">
              Beacon Educational Consult
            </p>
            <p className="mt-1 text-sm font-bold text-slate-700 uppercase">
              Lesson Plan — {subjectName}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Term {plan.term} · Week {plan.week} · {gradeLabel(plan.grade)}
            </p>
          </div>

          <div className="overflow-x-auto p-4">
            {/* Header block, national template layout */}
            <table className="mb-4 w-full border-collapse">
              <tbody>
                <tr>
                  <HCell label="Week Ending" value={H.weekEnding} />
                  <HCell label="Class" value={gradeLabel(plan.grade)} />
                  <HCell label="Class Size" value={H.classSize} />
                  <HCell label="Subject" value={subjectName} />
                </tr>
                <tr>
                  <HCell label="Duration" value={H.duration} />
                  <HCell label="Strand" value={H.strand} />
                  <HCell label="Sub Strand" value={H.subStrand} className="" />
                  <HCell label="Lesson" value={H.lessonLabel} />
                </tr>
                <tr>
                  <HCell
                    label="Content Standard"
                    value={H.contentStandard}
                    className="w-1/2"
                  />
                  <td className={cell} colSpan={3}>
                    <span className={lbl}>Indicator:</span>
                    <span className="whitespace-pre-line text-slate-700">
                      {H.indicator || '—'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className={cell} colSpan={2}>
                    <span className={lbl}>Performance Indicator:</span>
                    <span className="whitespace-pre-line text-slate-700">
                      {H.performanceIndicator || '—'}
                    </span>
                  </td>
                  <td className={cell} colSpan={2}>
                    <span className={lbl}>Core Competencies:</span>
                    <span className="whitespace-pre-line text-slate-700">
                      {H.competencies || '—'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className={cell} colSpan={4}>
                    <span className={lbl}>Teaching / Learning Resources:</span>
                    <span className="whitespace-pre-line text-slate-700">
                      {H.resources || '—'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className={cell} colSpan={2}>
                    <span className={lbl}>New words:</span>
                    <span className="whitespace-pre-line text-slate-700">
                      {H.newWords || '—'}
                    </span>
                  </td>
                  <td className={cell} colSpan={2}>
                    <span className={lbl}>References:</span>
                    <span className="whitespace-pre-line text-slate-700">
                      {H.references || '—'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Days × phases */}
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {[
                    'DAYS',
                    'PHASE 1: STARTER',
                    'PHASE 2: MAIN',
                    'PHASE 3: PLENARY / REFLECTION',
                  ].map((h) => (
                    <th
                      key={h}
                      className="border border-slate-300 bg-slate-100 px-3 py-2 text-left text-[11px] font-bold tracking-wide text-slate-700 uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(plan.days ?? []).map((d) => (
                  <tr key={d.day}>
                    <td className={`${cell} font-bold whitespace-nowrap`}>
                      {d.day}
                    </td>
                    <td className={`${cell} w-[28%] whitespace-pre-line`}>
                      {d.starter}
                    </td>
                    <td className={`${cell} w-[34%] whitespace-pre-line`}>
                      {d.main}
                    </td>
                    <td className={`${cell} w-[28%] whitespace-pre-line`}>
                      {d.plenary}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(plan.indicatorIds?.length ?? 0) > 0 && (
            <div className="border-t border-slate-200 px-6 py-3">
              <p className="flex flex-wrap gap-1.5">
                {plan.indicatorIds.map((id) => {
                  const ind = indicators.find((i) => i.id === id)
                  return (
                    <span
                      key={id}
                      className="rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-[11px] text-indigo-700"
                      title={ind?.description}
                    >
                      {ind?.code ?? id}
                    </span>
                  )
                })}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
