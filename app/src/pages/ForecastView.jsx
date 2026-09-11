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

const th =
  'border border-slate-300 bg-slate-100 px-2 py-2 text-left text-[11px] font-bold tracking-wide text-slate-700 uppercase italic'
const td =
  'border border-slate-300 px-2 py-2 align-top text-xs whitespace-pre-line'

export default function ForecastView() {
  const { forecastId } = useParams()
  const { user, profile } = useAuth()
  const { subjects } = useCurriculum()
  const navigate = useNavigate()
  const [scheme, setScheme] = useState(undefined)
  const [downloading, setDownloading] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [requesting, setRequesting] = useState(false)
  const toast = useToast()
  const gate = useExportGate()

  useEffect(() => {
    getDoc(doc(db, 'weekly_forecasts', forecastId)).then((snap) =>
      setScheme(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    )
  }, [forecastId])

  if (scheme === undefined)
    return <p className="text-slate-400">Loading scheme…</p>
  if (scheme === null) return <p className="text-slate-500">Scheme not found.</p>

  const isOwner = user?.uid === scheme.authorId
  const isAdmin = profile?.role === 'admin'
  const subject = subjects.find((s) => s.id === scheme.subjectId)
  const subjectName = subject?.name ?? scheme.subjectId
  const isScheme = scheme.kind === 'scheme'

  function handleDelete() {
    setConfirm({
      title: 'Delete this scheme of learning?',
      body: 'This cannot be undone.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'weekly_forecasts', forecastId))
          toast.success('Scheme deleted.')
          navigate('/portal/forecasts')
        } catch {
          toast.error('Failed to delete scheme.')
        }
      },
    })
  }

  // Agents get a watermarked preview; the owner gets the clean, deliverable file.
  async function handleDownload(format, { preview = false } = {}) {
    setDownloading(`${preview ? 'preview' : 'clean'}-${format}`)
    const args = {
      subjectName,
      gradeLabel: gradeLabel(scheme.grade),
      term: scheme.term,
      rows: scheme.rows,
      authorName: scheme.authorName,
      notes: scheme.notes,
      watermark: preview,
    }
    try {
      // Exporter libraries are heavy — load them only when needed.
      // Clean downloads count against the free-tier quota; watermarked
      // agent previews are exempt (see useExportGate).
      await gate(async () => {
        if (format === 'docx') {
          const { downloadSchemeDocx } = await import('../lib/schemeDocx')
          await downloadSchemeDocx(args)
        } else {
          const { downloadSchemePdf } = await import('../lib/schemePdf')
          await downloadSchemePdf(args)
        }
      }, { preview })
    } finally {
      setDownloading('')
    }
  }

  return (
    <div>
      <ConfirmModal config={confirm} onClose={() => setConfirm(null)} />
      {requesting && (
        <RequestDeliveryModal
          materialType="scheme"
          materialRef={{ collection: 'weekly_forecasts', id: scheme.id }}
          materialTitle={`${subjectName} — Scheme of Learning, Term ${scheme.term}`}
          onClose={() => setRequesting(false)}
        />
      )}
      <nav className="mb-2 text-sm text-slate-500">
        <Link to="/portal/forecasts" className="text-indigo-600 hover:underline">
          Schemes of Learning
        </Link>{' '}
        / {subjectName}
      </nav>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">
            {subjectName} — Term {scheme.term}{' '}
            <span className="text-slate-400">· {scheme.grade}</span>
          </h1>
          <p className="page-subtitle">
            by {scheme.authorName}
            {scheme.visibility === 'private' && ' · Private'}
          </p>
        </div>
        <span className="flex flex-wrap justify-end gap-2">
          {isScheme && (
            <Link
              to={`/portal/forecasts/new?from=${forecastId}`}
              className="rounded-md border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
            >
              Use as template
            </Link>
          )}
          {isScheme && isAdmin && (
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
          {isScheme && !isAdmin && (
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
          {(isOwner || isAdmin) && (
            <>
              <Link
                to={`/portal/forecasts/${forecastId}/edit`}
                className="rounded-md border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
              >
                Edit
              </Link>
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-md border border-red-200 px-4 py-1.5 text-sm text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </>
          )}
        </span>
      </div>

      {!isScheme ? (
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          This document was created with an older version of the app. Please
          create a new scheme of learning.
        </p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Branded document header, like the printed sample */}
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
              Scheme of Learning — {subjectName}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Term {scheme.term} · {gradeLabel(scheme.grade)} · Based on the
              NaCCA Standards-Based Curriculum
            </p>
          </div>

          <div className="overflow-x-auto p-4">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={th}>Weeks</th>
                  <th className={th}>Strand</th>
                  <th className={th}>Sub-strands</th>
                  <th className={th}>Content Standard</th>
                  <th className={th}>Indicators</th>
                  <th className={th}>Resources</th>
                  <th className={th} />
                </tr>
              </thead>
              <tbody>
                {(scheme.rows ?? []).map((row, i) =>
                  row.kind === 'special' ? (
                    <tr key={i} className="bg-slate-50">
                      <td className={`${td} font-bold`}>{row.week}</td>
                      <td
                        colSpan={6}
                        className={`${td} text-center font-bold tracking-wide`}
                      >
                        {row.label}
                      </td>
                    </tr>
                  ) : (
                    <tr key={i} className={i % 2 ? 'bg-slate-50/50' : ''}>
                      <td className={`${td} font-bold`}>{row.week}</td>
                      <td className={td}>{row.strand}</td>
                      <td className={td}>{row.subStrand}</td>
                      <td className={`${td} font-mono text-[11px]`}>
                        {row.contentStandards}
                      </td>
                      <td className={`${td} font-mono text-[11px]`}>
                        {row.indicators}
                      </td>
                      <td className={td}>{row.resources}</td>
                      <td className={td}>
                        {(row.indicatorIds?.length ?? 0) > 0 && (
                          <Link
                            to={`/portal/plans/new?subject=${scheme.subjectId}&indicator=${encodeURIComponent(row.indicatorIds[0])}`}
                            className="text-[11px] font-medium whitespace-nowrap text-amber-600 hover:underline"
                          >
                            + Plan
                          </Link>
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>

          {scheme.notes && (
            <div className="border-t border-slate-200 px-6 py-4">
              <h2 className="mb-1 text-sm font-semibold text-slate-800">
                Notes
              </h2>
              <p className="text-sm whitespace-pre-wrap text-slate-600">
                {scheme.notes}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
