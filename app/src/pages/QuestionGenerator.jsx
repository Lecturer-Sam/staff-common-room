import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useCurriculum, useGrades } from '../hooks/useCurriculum'
import useExportGate from '../hooks/useExportGate'
import { useSubscription } from '../context/SubscriptionContext'
import { gradeLabel } from '../lib/grades'
import {
  SCOPE_LIMIT,
  fetchQuestionsByScope,
  fetchQuestionsByFilters,
  fetchRecentQuestions,
} from '../lib/questionQueries'
import { generatePaperSections } from '../lib/questionSelection'
import { saveGeneratedTest } from '../lib/generatedTests'
import { getTemplate, buildSectionInstructions } from '../lib/testTemplate'
import { trackGeneration, timeOperation } from '../lib/analytics'

const TYPE_META = {
  mcq: { label: 'Multiple choice', instructions: 'Choose the correct answer from the options A to D.' },
  objective: { label: 'Objective', instructions: 'Choose the correct answer from the options A to D.' },
  true_false: { label: 'True/False', instructions: 'Indicate whether the statement is True or False.' },
  fill_blank: { label: 'Fill blank', instructions: 'Fill in the blank spaces.' },
  short: { label: 'Short answer', instructions: 'Answer the following questions briefly in the space provided.' },
  essay: { label: 'Essay', instructions: 'Answer the following questions in detail.' },
  structured: { label: 'Structured', instructions: 'Answer all questions in this section.' },
  long: { label: 'Long essay', instructions: 'Answer in detail.' },
}
const SECTION_LETTERS = ['A', 'B', 'C', 'D', 'E']
const LETTERS = ['A', 'B', 'C', 'D']

const uniq = (arr) => [...new Set(arr.filter(Boolean))]
const inputCls =
  'w-full rounded-lg border border-frame bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15 disabled:bg-slate-100 disabled:text-slate-500'
const labelCls =
  'mb-1 block text-[11px] font-semibold tracking-wide text-slate-500 uppercase'

export default function QuestionGenerator() {
  const { user, profile } = useAuth()
  const { isPro, hasGrant, planId, exportsLeft } = useSubscription()
  const gate = useExportGate()
  const grades = useGrades()
  const [grade, setGrade] = useState('B4')
  const { subjects, indicators } = useCurriculum(grade)
  const [bankState, setBankState] = useState(null)

  // Filters
  const [subjectId, setSubjectId] = useState('')
  const [strandName, setStrandName] = useState('')
  const [subStrandName, setSubStrandName] = useState('')
  const [contentStandardCode, setContentStandardCode] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [sections, setSections] = useState([
    { type: 'objective', count: 10, marks: '' },
  ])
  const [schoolName, setSchoolName] = useState(profile?.school ?? '')
  const [schoolLocked, setSchoolLocked] = useState(false)
  const [title, setTitle] = useState('End of Term Assessment')
  const [duration, setDuration] = useState('1 hour')
  const [instructions, setInstructions] = useState('Answer all questions. Write your name and index number on the answer sheet.')
  const [includeAnswers, setIncludeAnswers] = useState(false)
  const [templateId, setTemplateId] = useState('ges_basic_v1')
  const [paper, setPaper] = useState(null)
  const [paperMeta, setPaperMeta] = useState(null)
  const [warnings, setWarnings] = useState([])
  const [downloading, setDownloading] = useState('')
  const [saving, setSaving] = useState(false)
  const [genTimeMs, setGenTimeMs] = useState(null)

  const schoolId = profile?.schoolId || null

  // School name locked — PRD Phase 4: members of a school get its name pre-filled and disabled
  useEffect(() => {
    if (!schoolId) {
      setSchoolLocked(false)
      return
    }
    let active = true
    getDoc(doc(db, 'schools', schoolId))
      .then((snap) => {
        if (active && snap.exists()) {
          setSchoolName(snap.data().name || profile?.school || '')
          setSchoolLocked(true)
        }
      })
      .catch(() => {
        if (active) {
          setSchoolName(profile?.school || '')
          setSchoolLocked(true)
        }
      })
    return () => { active = false }
  }, [schoolId, profile?.school])

  // Derived curriculum lists
  const subjectIndicators = useMemo(() => indicators.filter((i) => i.subjectId === subjectId), [indicators, subjectId])
  const strands = useMemo(() => uniq(subjectIndicators.map((i) => i.strandName)), [subjectIndicators])
  const subStrands = useMemo(
    () => uniq(subjectIndicators.filter((i) => !strandName || i.strandName === strandName).map((i) => i.subStrandName)),
    [subjectIndicators, strandName],
  )
  const contentStandards = useMemo(() => {
    const map = new Map()
    subjectIndicators
      .filter((i) => (!strandName || i.strandName === strandName) && (!subStrandName || i.subStrandName === subStrandName))
      .forEach((i) => {
        if (!map.has(i.contentStandardCode)) {
          map.set(i.contentStandardCode, { code: i.contentStandardCode, desc: i.contentStandardDescription || i.contentStandardCode })
        }
      })
    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code))
  }, [subjectIndicators, strandName, subStrandName])

  // Fetch bank slice
  useEffect(() => {
    if (!user || !subjectId) return
    let active = true
    const done = (items, truncated) => {
      if (active) setBankState({ subjectId, grade, contentStandardCode, items, truncated })
    }
    const fetchFn = contentStandardCode
      ? () => fetchQuestionsByFilters({ grade, subjectId, contentStandardCode, status: 'published', max: SCOPE_LIMIT })
      : () => fetchQuestionsByScope({ subjectId })
    fetchFn()
      .then(({ items, truncated }) => done(items, truncated))
      .catch((err) => {
        console.warn('Scoped query failed, fallback:', err)
        return fetchRecentQuestions(1000).then(({ items, truncated }) => done(items, truncated))
      })
      .catch(() => done([], false))
    return () => { active = false }
  }, [user, subjectId, grade, contentStandardCode])

  const scopeMatch = !!bankState && bankState.subjectId === subjectId && bankState.grade === grade && (bankState.contentStandardCode || '') === (contentStandardCode || '')
  const bank = subjectId && scopeMatch ? bankState.items : null
  const bankTruncated = subjectId && scopeMatch && !!bankState?.truncated

  const subjectQuestions = useMemo(() => {
    const list = (bank ?? []).filter((q) => q.subjectId === subjectId && (q.grade ?? grade) === grade)
    return list.filter((q) => {
      if (strandName && q.strandName !== strandName) return false
      if (subStrandName && q.subStrandName !== subStrandName) return false
      if (difficulty && q.difficulty !== difficulty) return false
      if (contentStandardCode && q.contentStandardCode && q.contentStandardCode !== contentStandardCode) return false
      return true
    })
  }, [bank, subjectId, grade, strandName, subStrandName, difficulty, contentStandardCode])

  const availableByType = useMemo(() => {
    const c = { objective: 0, mcq: 0, essay: 0, short: 0, true_false: 0, fill_blank: 0 }
    for (const q of subjectQuestions) {
      const t = q.type
      if (['objective', 'mcq', 'true_false', 'fill_blank'].includes(t)) c.objective++
      if (t in c) c[t] = (c[t] ?? 0) + 1
      else c[t] = (c[t] ?? 0) + 1
      if (t === 'mcq') c.objective++
    }
    return c
  }, [subjectQuestions])

  const subjectName = subjects.find((s) => s.id === subjectId)?.name ?? ''

  function updateSection(i, patch) {
    setSections((ss) => ss.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  }

  async function generate() {
    const start = performance.now()
    const warns = []
    if (bankTruncated) {
      warns.push(`Bank truncated at ${SCOPE_LIMIT} — narrow filters (content standard) for precise selection.`)
    }

    const sectionConfigs = sections.map((cfg, i) => ({
      type: cfg.type,
      count: Math.max(1, Number(cfg.count) || 1),
      marks: cfg.marks ? Number(cfg.marks) : null,
      label: `SECTION ${SECTION_LETTERS[i]} — ${(TYPE_META[cfg.type]?.label || cfg.type).toUpperCase()}`,
      instructions: buildSectionInstructions(templateId, cfg.type),
      coverIndicators: true,
    }))

    const { sections: paperSections, totalMarks, warnings: selWarnings, allSelected } = generatePaperSections(subjectQuestions, sectionConfigs)
    warns.push(...selWarnings)

    const template = getTemplate(templateId)
    const newPaper = paperSections.length
      ? {
          schoolName,
          title,
          subtitle: `${subjectName} · ${gradeLabel(grade)}${contentStandardCode ? ` · ${contentStandardCode}` : ''}`,
          subjectName,
          gradeLabel: gradeLabel(grade),
          duration,
          instructions,
          sections: paperSections,
          totalMarks,
          template,
          filters: { grade, subjectId, strandName, subStrandName, contentStandardCode, difficulty },
        }
      : null

    setWarnings(warns)
    setPaper(newPaper)
    setPaperMeta({ allSelected, sectionConfigs })
    const elapsed = Math.round(performance.now() - start)
    setGenTimeMs(elapsed)

    if (!paperSections.length) {
      setWarnings([...warns, 'No matching questions in the bank yet. Add questions tagged to this content standard.'])
      trackGeneration({ success: false, grade, subjectId, contentStandardCode, requested: sectionConfigs.reduce((a, s) => a + s.count, 0), returned: 0, timeMs: elapsed, warnings: warns })
      return
    }

    // Save snapshot + analytics
    try {
      setSaving(true)
      const requestedCount = sectionConfigs.reduce((a, s) => a + s.count, 0)
      await saveGeneratedTest({
        user,
        profile,
        filters: { grade, subjectId, strandName, subStrandName, contentStandardCode, type: sections.map((s) => s.type).join(','), count: allSelected.length, requestedCount, difficulty },
        sections: paperSections,
        allSelected,
        totalMarks,
        title,
        includeAnswerKey: includeAnswers,
        templateId,
        genTimeMs: elapsed,
      })
      trackGeneration({ success: true, grade, subjectId, contentStandardCode, requested: requestedCount, returned: allSelected.length, timeMs: elapsed, warnings: warns, templateId, hasSchool: !!schoolId })
    } catch (e) {
      console.warn('Failed to save generated test snapshot:', e)
      warns.push('Paper generated but history save failed — check rules.')
      setWarnings(warns)
      trackGeneration({ success: false, grade, subjectId, contentStandardCode, requested: 0, returned: 0, timeMs: elapsed, warnings: [...warns, e.message] })
    } finally {
      setSaving(false)
    }
  }

  async function handleDownload(format, answerKeyOnly = false) {
    if (!paper) return
    const key = answerKeyOnly ? `${format}-key` : format
    setDownloading(key)
    try {
      await gate(async () => {
        const mod = await import('../lib/questionPaper')
        if (answerKeyOnly) {
          if (format === 'docx') await mod.downloadAnswerKeyDocx(paper, { template: templateId })
          else await mod.downloadAnswerKeyPdf(paper, { template: templateId })
        } else {
          if (format === 'docx') await mod.downloadPaperDocx(paper, { includeAnswers, template: templateId })
          else await mod.downloadPaperPdf(paper, { includeAnswers, template: templateId })
        }
      })
    } finally {
      setDownloading('')
    }
  }

  return (
    <div>
      <nav className="mb-2 text-sm text-slate-500">
        <Link to="/portal/questions" className="text-indigo-600 hover:underline">Question Bank</Link> / Generator
      </nav>
      <div className="flex items-center justify-between">
        <h1 className="page-title">Questions Generator</h1>
        <Link to="/portal/questions/history" className="text-xs text-indigo-600 hover:underline">View history & analytics</Link>
      </div>
      <p className="mb-6 text-sm text-slate-500">Phase 4: Templated PDFs (GES Basic / BECE Mock), locked school name, separate answer key (teacher-only), coverage summary, audit trail.</p>

      {!isPro && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">Access restricted — Pro or institutional grant required</p>
          <p className="mt-1 text-xs text-amber-700">
            PRD §8: You are on <b>{planId}</b> with {exportsLeft} free exports left. Upgrade to Pro (GHS 29/mo) or ask admin for manual authorization.
            {hasGrant && <span className="ml-1 font-semibold">Active grant detected — refresh if banner persists.</span>}
          </p>
          <div className="mt-3 flex gap-2">
            <Link to="/portal/subscription" className="rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700">Upgrade to Pro</Link>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        <div className="space-y-4">
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <p className={labelCls}>Curriculum filter (PRD critical)</p>
            <div><span className={labelCls}>Class</span><select value={grade} onChange={(e) => { setGrade(e.target.value); setSubjectId(''); setStrandName(''); setSubStrandName(''); setContentStandardCode(''); setPaper(null) }} className={inputCls}>{grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
            <div><span className={labelCls}>Subject</span><select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setStrandName(''); setSubStrandName(''); setContentStandardCode(''); setPaper(null) }} className={inputCls}><option value="">Select subject…</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div><span className={labelCls}>Strand</span><select value={strandName} onChange={(e) => { setStrandName(e.target.value); setSubStrandName(''); setContentStandardCode(''); setPaper(null) }} className={inputCls}><option value="">All strands</option>{strands.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
            <div><span className={labelCls}>Sub-strand</span><select value={subStrandName} onChange={(e) => { setSubStrandName(e.target.value); setContentStandardCode(''); setPaper(null) }} className={inputCls}><option value="">All sub-strands</option>{subStrands.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
            <div><span className={labelCls}>Content Standard *</span><select value={contentStandardCode} onChange={(e) => { setContentStandardCode(e.target.value); setPaper(null) }} className={inputCls}><option value="">All (not recommended)</option>{contentStandards.map((cs) => <option key={cs.code} value={cs.code}>{cs.code} — {cs.desc.slice(0, 70)}</option>)}</select></div>
            <div><span className={labelCls}>Difficulty filter</span><select value={difficulty} onChange={(e) => { setDifficulty(e.target.value); setPaper(null) }} className={inputCls}><option value="">All difficulties</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></div>
            {subjectId && bank && <p className="text-xs text-slate-500">Available: {subjectQuestions.length} filtered · {availableByType.objective || 0} objective · {availableByType.essay || 0} essay{bankTruncated && <span className="ml-1 text-amber-600">· truncated at {SCOPE_LIMIT}</span>}</p>}
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <p className={labelCls}>Sections (type + count)</p>
            {sections.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-5 text-xs font-bold text-slate-400">{SECTION_LETTERS[i]}</span>
                <select value={s.type} onChange={(e) => updateSection(i, { type: e.target.value })} className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs">
                  <option value="objective">Objective</option>
                  <option value="mcq">MCQ (legacy)</option>
                  <option value="true_false">True/False</option>
                  <option value="essay">Essay</option>
                  <option value="short">Short (legacy)</option>
                  <option value="structured">Structured</option>
                </select>
                <input type="number" min="1" max="60" value={s.count} onChange={(e) => updateSection(i, { count: e.target.value })} className="w-16 rounded-md border border-slate-300 px-2 py-1.5 text-xs" />
                <input type="number" min="1" max="50" placeholder="marks" value={s.marks} onChange={(e) => updateSection(i, { marks: e.target.value })} className="w-16 rounded-md border border-slate-300 px-2 py-1.5 text-xs" />
                {sections.length > 1 && <button type="button" onClick={() => setSections((ss) => ss.filter((_, j) => j !== i))} className="text-xs text-slate-400 hover:text-red-600">✕</button>}
              </div>
            ))}
            {sections.length < SECTION_LETTERS.length && <button type="button" onClick={() => setSections((ss) => [...ss, { type: 'essay', count: 5, marks: '' }])} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100">+ Add section</button>}
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <p className={labelCls}>Paper details — school name locked if you belong to a school (Phase 4)</p>
            <div>
              <span className={labelCls}>School name {schoolLocked && '(locked — from your school profile)'}</span>
              <input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} disabled={schoolLocked} className={inputCls} placeholder={schoolLocked ? '' : 'e.g. Achimota School'} />
              {schoolLocked && <p className="mt-1 text-[11px] text-slate-400">Members of a school get its name pre-filled and disabled so a document cannot be printed under another school's name (SCHOOL_WORKSPACE.md).</p>}
            </div>
            <div><span className={labelCls}>Paper title</span><input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><span className={labelCls}>Duration</span><input value={duration} onChange={(e) => setDuration(e.target.value)} className={inputCls} /></div>
              <div><span className={labelCls}>Template (configurable)</span><select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className={inputCls}><option value="ges_basic_v1">GES Basic - Standard</option><option value="bece_mock_v1">BECE Mock - WAEC Style (with coverage summary)</option></select></div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={includeAnswers} onChange={(e) => setIncludeAnswers(e.target.checked)} className="accent-indigo-600" />Include marking scheme inline (legacy) — or download separate teacher-only PDF below</label>
            <div><span className={labelCls}>General instructions</span><textarea rows={2} value={instructions} onChange={(e) => setInstructions(e.target.value)} className={inputCls} /></div>
          </div>

          <button type="button" disabled={!subjectId || !bank} onClick={generate} className="w-full rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
            {paper ? 'Regenerate (reshuffle)' : saving ? 'Saving history…' : 'Generate paper'} {genTimeMs != null && `· ${genTimeMs}ms`}
          </button>
          {warnings.map((w, i) => <p key={i} className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">{w}</p>)}
        </div>

        <div>
          {!paper ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400">Generated paper will preview here. Filter by content standard for precise papers.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-semibold text-slate-800">Preview · {paper.totalMarks} marks · {paperMeta?.allSelected?.length || 0} Qs {genTimeMs != null && `· ${genTimeMs}ms`} {saving && <span className="text-xs text-slate-400">(saving…)</span>}</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => handleDownload('pdf')} disabled={!!downloading} className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50">{downloading === 'pdf' ? 'Preparing…' : 'PDF (student)'}</button>
                  <button type="button" onClick={() => handleDownload('pdf', true)} disabled={!!downloading} className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{downloading === 'pdf-key' ? 'Preparing…' : 'PDF answer key (teacher-only)'}</button>
                  <button type="button" onClick={() => handleDownload('docx')} disabled={!!downloading} className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50">{downloading === 'docx' ? 'Preparing…' : 'Word'}</button>
                  <button type="button" onClick={() => handleDownload('docx', true)} disabled={!!downloading} className="rounded-md bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50">{downloading === 'docx-key' ? 'Preparing…' : 'Word key'}</button>
                </div>
              </div>
              <div className="p-6">
                <div className="mb-4 text-center">
                  <img src="/beaconlogo.png" alt="" className="mx-auto mb-2 h-12 w-12 object-contain" />
                  <p className="font-bold text-slate-900 uppercase">{paper.schoolName || 'Beacon Educational Consult'}</p>
                  <p className="text-sm font-semibold text-slate-700">{paper.title}</p>
                  <p className="text-xs text-slate-500">{paper.subtitle}{paper.duration && ` · Duration: ${paper.duration}`} · {paper.totalMarks} marks · {paper.template?.name || ''}</p>
                </div>
                {paper.instructions && <p className="mb-4 text-xs text-slate-500 italic">{paper.instructions}</p>}
                {paper.sections.map((section) => (
                  <div key={section.label} className="mb-5">
                    <p className="text-sm font-bold text-slate-800">{section.label}</p>
                    {section.instructions && <p className="mb-2 text-xs text-slate-500 italic">{section.instructions}</p>}
                    <ol className="space-y-2">
                      {section.questions.map((q) => (
                        <li key={q.id} className="text-sm text-slate-700">
                          <span className="font-medium">{q.number}.</span> <span className="whitespace-pre-wrap">{q.text || q.question}</span> <span className="text-xs text-slate-400">[{q.marks} {q.marks === 1 ? 'mark' : 'marks'}]{q.contentStandardCode ? ` · ${q.contentStandardCode}` : ''}</span>
                          {(q.type === 'mcq' || q.type === 'objective') && q.options?.length > 0 && (
                            <ul className="mt-1 ml-5 space-y-0.5 text-xs text-slate-600">
                              {q.options.map((o, i) => o ? <li key={i}>{LETTERS[i]}. {o}{includeAnswers && q.correctAnswer === LETTERS[i] && <span className="ml-1 font-semibold text-emerald-600">✓</span>}</li> : null)}
                            </ul>
                          )}
                          {includeAnswers && (q.type !== 'mcq' && q.type !== 'objective') && (q.markingGuide || q.answer) && <p className="mt-1 ml-5 text-xs text-emerald-700">Answer: {q.markingGuide || q.answer}</p>}
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
                {paper.template?.formatting?.footer?.showCoverageSummary && (
                  <div className="mt-6 border-t border-slate-200 pt-3">
                    <p className="text-xs font-bold text-slate-600 uppercase">Coverage Summary (for audit)</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {(() => {
                        const csMap = {}
                        paper.sections.forEach((s) => s.questions.forEach((q) => { if (q.contentStandardCode) csMap[q.contentStandardCode] = (csMap[q.contentStandardCode] || 0) + 1 }))
                        return Object.entries(csMap).map(([cs, c]) => `${cs}: ${c} Qs`).join(', ')
                      })()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
