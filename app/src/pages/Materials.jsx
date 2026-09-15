import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { db } from '../firebase'
import { Button, Card, Field, Input, PageHeader, Select } from '../components/ui'
import { fetchCatalog, generateAndDownload } from '../lib/materialService'
import { listMyGenerations, recordGeneration } from '../lib/generatedMaterials'
import { useGrades, useGradeSubjects } from '../hooks/useCurriculum'
import { downloadSchemes, loadSchemes, withSchemes } from '../lib/clientScheme'

/**
 * Generate Materials — the portal's front door to document generation.
 *
 * A school picks a grade and subject and gets a Scheme of Learning or Record of
 * Work pre-printed with its own details. Whatever is produced is recorded so
 * the school workspace can show it.
 *
 * The two kinds are produced differently on purpose:
 *
 *   Scheme  — built in the browser by lib/clientScheme.js from the
 *             pre-generated rows in /curriculum/<grade>_schemes.json. Needs no
 *             server, so it works on a static deployment with no Python host.
 *   Record  — still built by the Material Service (service/main.py), because
 *             there is no client-side exporter for it yet.
 *
 * That split means a broken or absent service degrades to "records are
 * unavailable" rather than taking the whole page down.
 */

const KIND_OPTIONS = [
  { value: 'scheme', label: 'Scheme of Learning' },
  { value: 'record', label: 'Record of Work' },
]

const TERM_OPTIONS = [
  { value: '', label: 'Full year (all three terms)' },
  { value: '1', label: 'Term 1' },
  { value: '2', label: 'Term 2' },
  { value: '3', label: 'Term 3' },
]

// Rough generation times, shown so the wait feels expected rather than broken.
const WAIT_HINT = {
  scheme: 'Built in your browser — a second or two.',
  record: 'A record of work takes a few seconds.',
}

function fmtWhen(ts) {
  if (!ts?.seconds) return ''
  return new Date(ts.seconds * 1000).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function describe(entry) {
  const what = entry.kind === 'scheme' ? 'Scheme' : 'Record'
  const grade = (entry.grade ?? '').replace('B', 'Basic ')
  const term = entry.term ? ` · Term ${entry.term}` : ' · Full year'
  return `${what} · ${grade}${term}`
}

export default function Materials() {
  const { user, profile, loading: authLoading } = useAuth()
  const toast = useToast()

  const schoolId = profile?.schoolId ?? null

  // Grades and subjects come from the static curriculum bundle, so the scheme
  // half of this page never depends on the service being up.
  const grades = useGrades()
  const gradeSubjects = useGradeSubjects(grade)
  const [schemeData, setSchemeData] = useState(null)

  // Only used by Record of Work, which the service still builds.
  const [catalog, setCatalog] = useState(null)
  const [catalogError, setCatalogError] = useState('')

  const [kind, setKind] = useState('scheme')
  const [grade, setGrade] = useState('B4')
  const [subject, setSubject] = useState('') // '' = every subject in the grade
  const [term, setTerm] = useState('')

  const [schoolName, setSchoolName] = useState('')
  const [teacher, setTeacher] = useState(profile?.displayName ?? '')
  const [className, setClassName] = useState('')
  const [year, setYear] = useState('')
  const [hod, setHod] = useState('')

  const [busy, setBusy] = useState(false)
  const [history, setHistory] = useState(null)

  // Effects are for external sync only — see docs/conventions.md.
  //
  // The service catalog is only needed for records, so a failure here is not
  // fatal: it disables that one option and leaves schemes working.
  useEffect(() => {
    let active = true
    fetchCatalog()
      .then((data) => active && setCatalog(data))
      .catch((err) => active && setCatalogError(err.message || 'unavailable'))
    return () => {
      active = false
    }
  }, [])

  // Which subjects in this grade actually have a scheme. Skipping entirely for
  // records keeps the bigger file off that path.
  useEffect(() => {
    if (kind !== 'scheme') return
    let active = true
    loadSchemes(grade).then((data) => active && setSchemeData(data))
    return () => {
      active = false
    }
  }, [grade, kind])

  // Members of a school get its name pre-filled and locked. Free text would
  // let anyone print another school's name on a document, which would also
  // poison the school's generation history.
  useEffect(() => {
    if (!schoolId) return
    let active = true
    getDoc(doc(db, 'schools', schoolId))
      .then((snap) => {
        if (active && snap.exists()) setSchoolName(snap.data().name ?? '')
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [schoolId])

  useEffect(() => {
    if (!user) return
    let active = true
    listMyGenerations(user.uid)
      .then((list) => active && setHistory(list))
      .catch(() => active && setHistory([]))
    return () => {
      active = false
    }
  }, [user])

  // Adjust state during render, not in an effect: changing the grade can
  // invalidate the chosen subject, so clear it the moment the grade changes.
  const [lastGrade, setLastGrade] = useState(grade)
  if (grade !== lastGrade) {
    setLastGrade(grade)
    setSubject('')
  }

  // Schemes are limited to subjects that actually have rows — most grades list
  // ten subjects but only seven have scheduled lessons, and offering the rest
  // would hand a teacher an empty table. Records use the service's own list.
  const subjects =
    kind === 'scheme'
      ? withSchemes(gradeSubjects, schemeData)
      : (catalog?.grades?.[grade] ?? [])

  const allSubjects = subject === ''
  const schoolLocked = Boolean(schoolId)

  // Records still need the service; schemes need nothing but the bundle.
  const recordUnavailable = kind === 'record' && Boolean(catalogError)
  const schemesReady = kind !== 'scheme' || Boolean(schemeData)

  async function handleGenerate() {
    setBusy(true)
    try {
      const request = { kind, grade, term: term || undefined }
      if (subject) request.subject = subject
      // Branding is optional; omitted fields fall back to blank cover lines.
      if (schoolName) request.school = schoolName
      if (teacher) request.teacher = teacher
      if (className) request.class_name = className
      if (year) request.year = year
      if (hod && kind === 'scheme') request.hod = hod

      let filename
      let isZip

      if (kind === 'scheme') {
        // Built here in the browser — no service, no round trip.
        const result = await downloadSchemes({
          grade,
          subjectId: subject,
          subjects: gradeSubjects,
          term,
          authorName: teacher || undefined,
        })
        filename = result.filename
        isZip = result.isZip
      } else {
        const idToken = await user?.getIdToken?.()
        const result = await generateAndDownload(request, idToken)
        filename = result.filename
        isZip = result.isZip
      }

      toast.success(
        isZip
          ? `Downloaded ${filename} — one document per subject.`
          : `Downloaded ${filename}`,
      )

      // Record it. A failure here must not undo a successful download, so it
      // is reported separately and never thrown.
      try {
        await recordGeneration({ user, schoolId, request, filename, isZip })
        const list = await listMyGenerations(user.uid)
        setHistory(list)
      } catch {
        toast.error('Downloaded, but could not save it to your history.')
      }
    } catch (err) {
      // 503/500 from the service carry a useful `detail`; surface it.
      toast.error(err.message || 'Generation failed.')
    } finally {
      setBusy(false)
    }
  }

  const serviceDown = Boolean(catalogError)

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <PageHeader
        title="Generate materials"
        subtitle="Produce a Scheme of Learning or Record of Work for your class, pre-printed with your school's details."
      />

      {serviceDown && (
        <Card className="mb-6 border-amber-300 bg-amber-50">
          <p className="text-sm font-semibold text-amber-900">
            Records of work are unavailable — schemes still work.
          </p>
          <p className="mt-1 text-xs leading-relaxed text-amber-800">
            {catalogError}. Schemes of Learning are built in your browser and
            need no service. To enable records too, make sure it is running
            locally (<code>python service/main.py</code>) or that{' '}
            <code>VITE_MATERIALS_URL</code> points at the deployed service.
          </p>
        </Card>
      )}

      <Card className="mb-6">
        <h2 className="section-heading mb-4">What to generate</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Document type" htmlFor="kind">
            <Select
              id="kind"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              {KIND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Grade"
            htmlFor="grade"
            hint={
              subjects.length
                ? `${subjects.length} subjects available`
                : 'Loading…'
            }
          >
            <Select
              id="grade"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              disabled={!grades.length}
            >
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Subject"
            htmlFor="subject"
            hint={allSubjects ? 'Downloads one document per subject' : undefined}
          >
            <Select
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={!subjects.length}
            >
              <option value="">All subjects in this grade</option>
              {subjects.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Term" htmlFor="term">
            <Select
              id="term"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            >
              {TERM_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <Card className="mb-6">
        <h2 className="section-heading mb-1">Printed on the cover</h2>
        <p className="card-meta mb-4">
          Optional. Anything you leave blank prints as a line for teachers to
          fill in by hand.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="School"
            htmlFor="school"
            hint={schoolLocked ? 'Taken from your school profile' : undefined}
          >
            <Input
              id="school"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              disabled={schoolLocked}
              placeholder={schoolLocked ? '' : 'e.g. Achimota School'}
            />
          </Field>

          <Field label="Class" htmlFor="class">
            <Input
              id="class"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="e.g. Basic 4"
            />
          </Field>

          <Field label="Teacher" htmlFor="teacher">
            <Input
              id="teacher"
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
              placeholder="e.g. Mr. K. Mensah"
            />
          </Field>

          <Field label="Academic year" htmlFor="year">
            <Input
              id="year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="e.g. 2026"
            />
          </Field>

          {kind === 'scheme' && (
            <Field label="Head of Department" htmlFor="hod">
              <Input
                id="hod"
                value={hod}
                onChange={(e) => setHod(e.target.value)}
                placeholder="Signs the completed scheme"
              />
            </Field>
          )}
        </div>
      </Card>

      <div className="mb-8 flex flex-wrap items-center gap-3">
        {/*
          Wait for auth to resolve, not just the catalog. Generating before the
          profile loads would send schoolId: null, and the rules pin schoolId
          to the caller's real school — so the download would succeed but the
          history write would be denied.
        */}
        <Button
          onClick={handleGenerate}
          disabled={busy || recordUnavailable || !schemesReady || authLoading}
        >
          {busy ? 'Generating…' : 'Generate and download'}
        </Button>
        <span className="card-meta">
          {allSubjects
            ? `One ${kind === 'scheme' ? 'scheme' : 'record'} per subject, zipped.`
            : WAIT_HINT[kind]}
        </span>
      </div>

      <Card>
        <h2 className="section-heading mb-3">Your recent downloads</h2>
        {history === null ? (
          <p className="card-meta">Loading…</p>
        ) : history.length === 0 ? (
          <p className="card-meta">
            Nothing yet. Anything you generate is listed here and in your
            school&rsquo;s workspace.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {history.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-baseline justify-between gap-2 py-2"
              >
                <span className="text-sm text-slate-800">
                  {describe(entry)}
                  {entry.isZip && (
                    <span className="ml-2 text-xs text-slate-400">
                      all subjects
                    </span>
                  )}
                </span>
                <span className="text-xs text-slate-400">
                  {fmtWhen(entry.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
