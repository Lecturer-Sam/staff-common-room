import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { db } from '../firebase'
import { Button, Card, Field, Input, PageHeader, Select } from '../components/ui'
import { listMyGenerations, recordGeneration } from '../lib/generatedMaterials'
import { useGrades, useGradeSubjects } from '../hooks/useCurriculum'
import { downloadSchemes, loadSchemes, withSchemes } from '../lib/clientScheme'
import { downloadRecords, loadSchedules, withSchedules } from '../lib/clientRecord'

/**
 * Generate Materials — the portal's front door to document generation.
 *
 * A school picks a grade and subject and gets a Scheme of Learning or Record of
 * Work pre-printed with its own details. Whatever is produced is recorded so
 * the school workspace can show it.
 *
 * Both kinds are built in the browser, from data already shipped in the static
 * bundle:
 *
 *   Scheme  — lib/clientScheme.js from /curriculum/<grade>_schemes.json
 *   Record  — lib/clientRecord.js from /curriculum/<grade>_schedules.json
 *
 * Neither needs a server, so this page works on a static deployment with no
 * Python host. The Material Service (service/main.py) produces equivalent
 * output server-side and is still available for bulk jobs, but nothing here
 * depends on it.
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
  record: 'A full year lists 180 lessons, so allow a few seconds.',
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

  // Everything here comes from the static curriculum bundle, so the page never
  // depends on a service being up.
  const grades = useGrades()
  const gradeSubjects = useGradeSubjects(grade)

  // Which subjects actually have data for the chosen kind. Each is only
  // fetched for the kind that needs it, since the schedules file is ~3 MB.
  const [schemeData, setSchemeData] = useState(null)
  const [scheduleData, setScheduleData] = useState(null)

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
  // Only the file for the selected kind is fetched, and each is cached at
  // module level, so switching between the two costs one download each.
  useEffect(() => {
    if (kind !== 'scheme') return
    let active = true
    loadSchemes(grade).then((data) => active && setSchemeData(data))
    return () => {
      active = false
    }
  }, [grade, kind])

  useEffect(() => {
    if (kind !== 'record') return
    let active = true
    loadSchedules(grade).then((data) => active && setScheduleData(data))
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

  // Narrowed to subjects that actually have rows. Most grades list ten subjects
  // but only seven have scheduled lessons, and offering the rest would hand a
  // teacher an empty document.
  const subjects =
    kind === 'scheme'
      ? withSchemes(gradeSubjects, schemeData)
      : withSchedules(gradeSubjects, scheduleData)

  const allSubjects = subject === ''
  const schoolLocked = Boolean(schoolId)

  // Nothing to generate until the file for this kind has arrived.
  const ready = kind === 'scheme' ? Boolean(schemeData) : Boolean(scheduleData)

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

      // Both kinds are built here in the browser — no service, no round trip.
      const shared = { grade, subjectId: subject, subjects: gradeSubjects, term }

      const branding = {
        school: schoolName || undefined,
        teacher: teacher || undefined,
        className: className || undefined,
        year: year || undefined,
      }

      const result =
        kind === 'scheme'
          ? await downloadSchemes({
              ...shared,
              ...branding,
              authorName: teacher || undefined,
              hod: hod || undefined,
            })
          : await downloadRecords({ ...shared, ...branding })

      const { filename, isZip } = result

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
      // The generators throw plain, human-readable messages; show them as-is.
      toast.error(err.message || 'Generation failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <PageHeader
        title="Generate materials"
        subtitle="Produce a Scheme of Learning or Record of Work for your class, pre-printed with your school's details."
      />

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
                <option key={s.id} value={s.id}>
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
          Wait for auth to resolve, not just the data. Generating before the
          profile loads would send schoolId: null, and the rules pin schoolId
          to the caller's real school — so the download would succeed but the
          history write would be denied.
        */}
        <Button onClick={handleGenerate} disabled={busy || !ready || authLoading}>
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
