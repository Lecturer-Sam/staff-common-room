import { useRef, useState, useCallback, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Upload, Download, Trash2, FileJson, FileSpreadsheet,
  HardDrive, RefreshCw, CheckCircle, AlertTriangle,
} from 'lucide-react'
import db from '../db/db'
import { seedIfNeeded, resetSeed } from '../db/seed'
import { parseCSV, questionsToCSV } from '../lib/csvMapper'

/* ── Storage usage bar ─────────────────────────────────────────────────── */
function StorageBar() {
  const [info, setInfo] = useState(null)

  useEffect(() => {
    navigator.storage?.estimate().then((est) => {
      setInfo({
        used:  est.usage  ?? 0,
        quota: est.quota  ?? 0,
        pct:   est.quota  ? Math.round((est.usage / est.quota) * 100) : 0,
      })
    })
  }, [])

  const fmt = (bytes) => {
    if (bytes < 1024)         return `${bytes} B`
    if (bytes < 1024 ** 2)    return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 ** 3)    return `${(bytes / 1024 ** 2).toFixed(1)} MB`
    return                          `${(bytes / 1024 ** 3).toFixed(2)} GB`
  }

  return (
    <div className="rounded-[16px] bg-white border border-slate-200 p-4 space-y-2">
      <div className="flex items-center gap-2 text-[12px] font-bold text-navy">
        <HardDrive size={14} /> Storage Usage
      </div>
      {info ? (
        <>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-navy transition-all"
              style={{ width: `${Math.min(info.pct, 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400">
            {fmt(info.used)} used of {fmt(info.quota)} · {info.pct}%
          </p>
        </>
      ) : (
        <p className="text-[11px] text-slate-400 animate-pulse">Calculating…</p>
      )}
    </div>
  )
}

/* ── Tiny stat card ─────────────────────────────────────────────────────── */
function Stat({ label, value, sub }) {
  return (
    <div className="rounded-[14px] bg-slate-50 border border-slate-200 p-3 text-center">
      <p className="text-[22px] font-extrabold text-navy leading-none">{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-1">{label}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

/* ── Preview table (first 5 rows) ───────────────────────────────────────── */
function PreviewTable({ rows }) {
  if (!rows.length) return null
  const preview = rows.slice(0, 5)
  return (
    <div className="rounded-[12px] border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] text-left">
          <thead className="bg-slate-50 border-b border-slate-200
                            text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              {['id','type','diff','stem','opts','answer'].map((h) => (
                <th key={h} className="px-3 py-2 font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {preview.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-mono text-slate-500 whitespace-nowrap">{r.id}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className="px-1.5 py-0.5 rounded-full bg-navy text-accent
                                   text-[10px] font-bold">{r.type}</span>
                </td>
                <td className="px-3 py-2 capitalize">{r.difficulty}</td>
                <td className="px-3 py-2 max-w-[180px] truncate">{r.stem}</td>
                <td className="px-3 py-2">{r.options?.length ?? 0}</td>
                <td className="px-3 py-2 font-mono">
                  {Array.isArray(r.answer) ? r.answer.join(',') : String(r.answer)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 5 && (
        <p className="text-[11px] text-slate-400 text-center py-2 border-t border-slate-100">
          + {rows.length - 5} more rows
        </p>
      )}
    </div>
  )
}

/* ── Main Data Manager ──────────────────────────────────────────────────── */
export default function DataManager() {
  // Live counts from Dexie
  const qCount  = useLiveQuery(() => db.questions.count(),  [], 0)
  const csCount = useLiveQuery(() => db.contentStandards.count(), [], 0)
  const attCount = useLiveQuery(() => db.attempts.count(),  [], 0)

  // Import state
  const [parsed,    setParsed]    = useState(null)   // { rows, errors }
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState(null)   // { ok, text }

  // Reset state
  const [resetting, setResetting] = useState(false)

  const dropRef    = useRef(null)
  const fileInput  = useRef(null)

  /* ── File handling ───────────────────────────────────────────────────── */
  const handleFile = useCallback(async (file) => {
    setParsed(null)
    setImportMsg(null)

    const ext = file.name.split('.').pop().toLowerCase()

    if (ext === 'json') {
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        const items = Array.isArray(data) ? data : (data.items ?? [])
        if (!items.length) throw new Error('No items array found in JSON')
        setParsed({ rows: items, errors: [] })
      } catch (e) {
        setParsed({ rows: [], errors: [`JSON parse error: ${e.message}`] })
      }
      return
    }

    if (ext === 'csv') {
      const result = await parseCSV(file)
      setParsed(result)
      return
    }

    setParsed({ rows: [], errors: [`Unsupported file type: .${ext}. Use .json or .csv`] })
  }, [])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    dropRef.current?.classList.remove('border-accent')
    const file = e.dataTransfer?.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const onDragOver = (e) => {
    e.preventDefault()
    dropRef.current?.classList.add('border-accent')
  }

  const onDragLeave = () => dropRef.current?.classList.remove('border-accent')

  /* ── Import to Dexie ─────────────────────────────────────────────────── */
  const handleImport = async () => {
    if (!parsed?.rows?.length) return
    setImporting(true)
    setImportMsg(null)
    try {
      await db.questions.bulkPut(parsed.rows)
      setImportMsg({ ok: true, text: `Imported ${parsed.rows.length} questions successfully.` })
      setParsed(null)
    } catch (e) {
      setImportMsg({ ok: false, text: `Import failed: ${e.message}` })
    }
    setImporting(false)
  }

  /* ── Export all questions ────────────────────────────────────────────── */
  const handleExport = async () => {
    const all = await db.questions.toArray()
    const csv = questionsToCSV(all)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `nacca_questions_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ── Export attempts ─────────────────────────────────────────────────── */
  const handleExportAttempts = async () => {
    const all = await db.attempts.toArray()
    const rows = all.map((a) => ({
      id: a.id, csId: a.csId, classId: a.classId, subjectId: a.subjectId,
      score: a.score, total: a.total, pct: Math.round((a.score / a.total) * 100),
      timeSeconds: a.timeSeconds, date: a.date,
    }))
    const csv  = [
      Object.keys(rows[0] ?? {}).join(','),
      ...rows.map((r) => Object.values(r).join(',')),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `nacca_results_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ── Reset & re-seed ─────────────────────────────────────────────────── */
  const handleReset = async () => {
    if (!confirm('This will wipe all questions and re-seed from the bundled data files. Your attempt history is preserved. Continue?')) return
    setResetting(true)
    await resetSeed()
    await seedIfNeeded({ force: true })
    setResetting(false)
    setImportMsg({ ok: true, text: 'Database re-seeded from bundled data.' })
  }

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-full bg-surface">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5 pb-10">

        {/* Title */}
        <div>
          <h1 className="text-[22px] font-extrabold text-navy">Data Manager</h1>
          <p className="text-[12px] text-slate-400 mt-0.5">
            Import questions · export results · manage local DB
          </p>
        </div>

        {/* DB stats */}
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Questions"  value={qCount}   />
          <Stat label="Standards"  value={csCount}  />
          <Stat label="Attempts"   value={attCount} />
        </div>

        {/* Storage */}
        <StorageBar />

        {/* ── Import section ───────────────────────────────────────────── */}
        <div className="rounded-[20px] bg-white border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2 text-[13px] font-bold text-navy">
            <Upload size={16} /> Import Questions
          </div>

          {/* Dropzone */}
          <div
            ref={dropRef}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => fileInput.current?.click()}
            className="rounded-[14px] border-2 border-dashed border-slate-200
                       bg-slate-50 p-8 text-center cursor-pointer
                       hover:border-navy/30 transition-colors"
          >
            <div className="flex justify-center gap-3 mb-3">
              <FileJson    size={24} className="text-indigo-400" />
              <FileSpreadsheet size={24} className="text-emerald-400" />
            </div>
            <p className="text-[13px] font-semibold text-navy">
              Drop a file here or tap to browse
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Supports <span className="font-mono">.json</span> and{' '}
              <span className="font-mono">.csv</span>
            </p>
          </div>

          <input
            ref={fileInput}
            type="file"
            accept=".json,.csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />

          {/* Parse errors */}
          {parsed?.errors?.length > 0 && (
            <div className="rounded-[12px] bg-red-50 border border-red-200 p-3 space-y-1">
              <p className="text-[12px] font-bold text-red-700 flex items-center gap-1.5">
                <AlertTriangle size={13} /> {parsed.errors.length} error{parsed.errors.length !== 1 ? 's' : ''}
              </p>
              {parsed.errors.slice(0, 5).map((e, i) => (
                <p key={i} className="text-[11px] text-red-600 font-mono">{e}</p>
              ))}
            </div>
          )}

          {/* Preview */}
          {parsed?.rows?.length > 0 && (
            <div className="space-y-3">
              <p className="text-[12px] font-semibold text-slate-600">
                Preview — {parsed.rows.length} row{parsed.rows.length !== 1 ? 's' : ''} ready to import
              </p>
              <PreviewTable rows={parsed.rows} />
              <button
                onClick={handleImport}
                disabled={importing}
                className="w-full h-11 rounded-full bg-navy text-accent
                           font-bold text-[13px] flex items-center justify-center gap-2
                           disabled:opacity-50 active:scale-[0.98] transition-transform"
              >
                {importing
                  ? <><RefreshCw size={14} className="animate-spin" /> Importing…</>
                  : <><Upload size={14} /> Import {parsed.rows.length} Questions</>}
              </button>
            </div>
          )}

          {/* Import result message */}
          {importMsg && (
            <div className={`rounded-[12px] p-3 flex items-center gap-2 text-[12px] font-semibold
                             ${importMsg.ok
                               ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                               : 'bg-red-50   border border-red-200   text-red-600'}`}>
              {importMsg.ok
                ? <CheckCircle size={14} />
                : <AlertTriangle size={14} />}
              {importMsg.text}
            </div>
          )}
        </div>

        {/* ── Export section ────────────────────────────────────────────── */}
        <div className="rounded-[20px] bg-white border border-slate-200 p-5 space-y-3">
          <div className="flex items-center gap-2 text-[13px] font-bold text-navy">
            <Download size={16} /> Export
          </div>

          <button
            onClick={handleExport}
            className="w-full h-11 rounded-full border-2 border-navy text-navy
                       font-bold text-[13px] flex items-center justify-center gap-2
                       active:scale-[0.98] transition-transform hover:bg-navy/5"
          >
            <FileSpreadsheet size={16} /> Export All Questions (.csv)
          </button>

          <button
            onClick={handleExportAttempts}
            disabled={attCount === 0}
            className="w-full h-11 rounded-full border-2 border-slate-200 text-slate-600
                       font-bold text-[13px] flex items-center justify-center gap-2
                       disabled:opacity-40 active:scale-[0.98] transition-transform"
          >
            <Download size={16} /> Export My Results ({attCount} attempts)
          </button>
        </div>

        {/* ── Database section ──────────────────────────────────────────── */}
        <div className="rounded-[20px] bg-white border border-slate-200 p-5 space-y-3">
          <div className="flex items-center gap-2 text-[13px] font-bold text-navy">
            <HardDrive size={16} /> Database
          </div>

          <p className="text-[12px] text-slate-400 leading-relaxed">
            Re-seed wipes the question bank and reloads from the bundled
            data files. Your attempt history is preserved.
          </p>

          <button
            onClick={handleReset}
            disabled={resetting}
            className="w-full h-11 rounded-full border-2 border-red-200 text-red-600
                       font-bold text-[13px] flex items-center justify-center gap-2
                       disabled:opacity-50 active:scale-[0.98] transition-transform
                       hover:bg-red-50"
          >
            {resetting
              ? <><RefreshCw size={14} className="animate-spin" /> Re-seeding…</>
              : <><Trash2 size={14} /> Wipe & Re-seed Questions</>}
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-slate-300 font-mono">
          NACCA QuizBank · offline-first · v1.0.0
        </p>
      </div>
    </div>
  )
}
