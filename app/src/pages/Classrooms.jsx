import { useEffect, useMemo, useState } from 'react'
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useAllSubjects, useGrades } from '../hooks/useCurriculum'
import { createClassroom, createStudent } from '../lib/classrooms'
import { gradeLabel } from '../lib/grades'
import { Badge, Button, Card, Input, Select } from '../components/ui'
import EmptyState from '../components/EmptyState'
import { SkeletonList } from '../components/Skeleton'

/**
 * Teacher classroom management (Phase 3): create classrooms, add pupils
 * (provisions a synthetic login — join code + access code), and review
 * in-app quiz results.
 */
export default function Classrooms() {
  const { user, profile } = useAuth()
  const toast = useToast()
  const grades = useGrades()
  const subjects = useAllSubjects()

  const [classrooms, setClassrooms] = useState(null)
  const [students, setStudents] = useState(null) // all student users, filtered client-side
  const [quizzes, setQuizzes] = useState([])
  const [attempts, setAttempts] = useState([])

  const [name, setName] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [grade, setGrade] = useState('B1')
  const [creating, setCreating] = useState(false)
  const [newStudentNames, setNewStudentNames] = useState({}) // classroomId → name input
  const [adding, setAdding] = useState('') // classroomId being added to
  const [freshCodes, setFreshCodes] = useState(null) // last created student
  const [gradingQuizId, setGradingQuizId] = useState(null) // quiz whose written answers are open
  const [drafts, setDrafts] = useState({}) // attemptId → { questionIndex: marks }

  const myId = user?.uid

  useEffect(() => {
    if (!myId) return
    let active = true
    getDocs(query(collection(db, 'classrooms'), where('teacherId', '==', myId)))
      .then((s) => active && setClassrooms(collect(s)))
      .catch(() => active && setClassrooms([]))
    getDocs(query(collection(db, 'users'), where('role', '==', 'student')))
      .then((s) => active && setStudents(collect(s)))
      .catch(() => active && setStudents([]))
    return () => {
      active = false
    }
  }, [myId])

  // Quizzes + attempts for all my classrooms (batched by classroom).
  useEffect(() => {
    if (!classrooms || classrooms.length === 0) return
    let active = true
    Promise.all(
      classrooms.map((c) =>
        Promise.all([
          getDocs(query(collection(db, 'quizzes'), where('classroomId', '==', c.id))).catch(() => null),
          getDocs(query(collection(db, 'quiz_attempts'), where('classroomId', '==', c.id))).catch(() => null),
        ]),
      ),
    ).then((pairs) => {
      if (!active) return
      setQuizzes(pairs.flatMap(([q]) => collect(q)))
      setAttempts(pairs.flatMap(([, a]) => collect(a)))
    })
    return () => {
      active = false
    }
  }, [classrooms])

  function collect(snap) {
    if (!snap) return []
    const list = []
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
    return list
  }

  const subjectName = (id) => subjects.find((s) => s.id === id)?.name ?? id ?? 'General'

  async function submitClassroom(e) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Give the classroom a name.')
      return
    }
    setCreating(true)
    try {
      const created = await createClassroom({ name, subjectId, grade }, profile, user)
      toast.success(`Classroom created — join code ${created.joinCode}.`)
      setName('')
      // Refresh the list
      const s = await getDocs(query(collection(db, 'classrooms'), where('teacherId', '==', myId)))
      setClassrooms(collect(s))
    } catch {
      toast.error('Could not create the classroom — check the deployed rules include classrooms.')
    } finally {
      setCreating(false)
    }
  }

  async function addStudent(classroom) {
    const studentName = (newStudentNames[classroom.id] ?? '').trim()
    if (!studentName) return
    setAdding(classroom.id)
    try {
      const created = await createStudent(classroom, studentName, profile)
      setFreshCodes({ classroomId: classroom.id, ...created, joinCode: classroom.joinCode })
      setNewStudentNames((m) => ({ ...m, [classroom.id]: '' }))
      const s = await getDocs(query(collection(db, 'users'), where('role', '==', 'student')))
      setStudents(collect(s))
      toast.success(`${created.name} added to ${classroom.name}.`)
    } catch (err) {
      toast.error(`Could not add student (${err?.code ?? 'error'}).`)
    } finally {
      setAdding('')
    }
  }

  function copy(text) {
    navigator.clipboard?.writeText(text).then(
      () => toast.info('Copied to clipboard.'),
      () => toast.error('Could not copy — select and copy manually.'),
    )
  }

  /** Save the teacher's marks for one attempt's written answers. */
  async function saveGrades(attempt) {
    const draft = drafts[attempt.id] ?? {}
    const grades = { ...(attempt.grades ?? {}) }
    for (const [qi, val] of Object.entries(draft)) {
      if (val === '') delete grades[qi]
      else grades[qi] = Math.max(0, Number(val) || 0)
    }
    try {
      await updateDoc(doc(db, 'quiz_attempts', attempt.id), { grades })
      setAttempts((list) => list.map((a) => (a.id === attempt.id ? { ...a, grades } : a)))
      toast.success('Marks saved.')
    } catch {
      toast.error('Could not save marks — check the deployed rules allow teacher grading.')
    }
  }

  const rosterFor = useMemo(() => {
    const map = {}
    for (const s of students ?? []) {
      if (!s.classroomId) continue
      ;(map[s.classroomId] ??= []).push(s)
    }
    for (const k of Object.keys(map)) map[k].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
    return map
  }, [students])

  return (
    <div>
      <h1 className="page-title">Classrooms</h1>
      <p className="page-subtitle mb-6">
        Run in-app quizzes for your pupils: create a class, add pupils (they log in with
        the class code + their access code), assign quizzes from the Quiz Maker, and see
        results here.
      </p>

      {/* ── Fresh student codes (hand these to the pupil) ── */}
      {freshCodes && (
        <Card className="mb-6 border-l-4 border-l-emerald-400">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-800">
                {freshCodes.name} can now log in
              </p>
              <p className="mt-1 text-sm text-slate-600">
                On the login page choose <b>Student</b> and enter:
              </p>
              <p className="mt-1 font-mono text-sm text-slate-800">
                Class code: <b>{freshCodes.joinCode}</b> · Access code: <b>{freshCodes.accessCode}</b>
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Write these down — pupils need both codes every time they log in.
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => copy(`${freshCodes.joinCode} / ${freshCodes.accessCode}`)}>
                Copy codes
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setFreshCodes(null)}>
                Dismiss
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ── Create classroom ── */}
      <Card className="mb-6">
        <form onSubmit={submitClassroom} className="flex flex-wrap items-end gap-3">
          <div className="min-w-52 flex-1">
            <label className="label-caps" htmlFor="class-name">Class name</label>
            <Input
              id="class-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. B4 Gold — Maths"
            />
          </div>
          <div>
            <label className="label-caps" htmlFor="class-subject">Subject</label>
            <Select id="class-subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="w-auto">
              <option value="">General</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="label-caps" htmlFor="class-grade">Class</label>
            <Select id="class-grade" value={grade} onChange={(e) => setGrade(e.target.value)} className="w-auto">
              {grades.map((g) => (
                <option key={g.id} value={g.id}>{gradeLabel(g.id)}</option>
              ))}
            </Select>
          </div>
          <Button type="submit" disabled={creating}>
            {creating ? 'Creating…' : '+ Create classroom'}
          </Button>
        </form>
      </Card>

      {/* ── Classrooms ── */}
      {!classrooms ? (
        <SkeletonList count={2} />
      ) : classrooms.length === 0 ? (
        <EmptyState
          icon="question"
          title="No classrooms yet"
          body="Create your first classroom above, then add pupils and assign quizzes from the Quiz Maker."
        />
      ) : (
        <div className="space-y-6">
          {classrooms.map((c) => {
            const roster = rosterFor[c.id] ?? []
            const classQuizzes = (quizzes ?? []).filter((q) => q.classroomId === c.id)
            const classAttempts = (attempts ?? []).filter((a) => a.classroomId === c.id)
            return (
              <Card key={c.id} banner={
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">
                    {c.name} <span className="ml-1 font-normal opacity-80">· {subjectName(c.subjectId)} · {gradeLabel(c.grade)}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => copy(c.joinCode)}
                    title="Copy join code"
                    className="rounded-md bg-white/15 px-2.5 py-1 font-mono text-xs font-bold tracking-wider hover:bg-white/25"
                  >
                    Class code: {c.joinCode}
                  </button>
                </div>
              }>
                {/* Roster */}
                <p className="label-caps mb-1">Pupils ({roster.length})</p>
                {roster.length === 0 ? (
                  <p className="text-sm text-slate-400">No pupils yet — add the first one below.</p>
                ) : (
                  <ul className="mb-3 grid gap-1 sm:grid-cols-2">
                    {roster.map((s) => (
                      <li key={s.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5">
                        <span className="truncate text-sm text-slate-700">{s.name}</span>
                        <button
                          type="button"
                          title={`Access code: ${s.accessCode ?? '—'} (click to copy)`}
                          onClick={() => copy(`${c.joinCode} / ${s.accessCode ?? ''}`)}
                          className="ml-2 shrink-0 font-mono text-xs text-slate-400 hover:text-slate-600"
                        >
                          {s.accessCode ?? '••••••'}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <Input
                    value={newStudentNames[c.id] ?? ''}
                    onChange={(e) => setNewStudentNames((m) => ({ ...m, [c.id]: e.target.value }))}
                    placeholder="Pupil's name…"
                    className="max-w-60 py-2"
                  />
                  <Button size="sm" onClick={() => addStudent(c)} disabled={adding === c.id || !(newStudentNames[c.id] ?? '').trim()}>
                    {adding === c.id ? 'Adding…' : '+ Add pupil'}
                  </Button>
                </div>

                {/* Quizzes assigned */}
                <p className="label-caps mb-1">Quizzes ({classQuizzes.length})</p>
                {classQuizzes.length === 0 ? (
                  <p className="mb-3 text-sm text-slate-400">
                    None yet — build one in the Quiz Maker and choose “Assign to classroom”.
                  </p>
                ) : (
                  <div className="mb-3 space-y-2">
                    {classQuizzes.map((q) => {
                      const sits = classAttempts.filter((a) => a.quizId === q.id)
                      const avg = sits.length
                        ? Math.round(sits.reduce((acc, a) => acc + (a.total ? (a.score / a.total) * 100 : 0), 0) / sits.length)
                        : null
                      const writtenIdx = (q.questions ?? [])
                        .map((qq, i) => (qq.type !== 'mcq' ? i : null))
                        .filter((i) => i !== null)
                      const toMark = sits.filter(
                        (a) => a.answers && writtenIdx.some((i) => a.answers[`${i}`]),
                      )
                      const isOpen = gradingQuizId === q.id
                      return (
                        <div key={q.id} className="rounded-lg border border-slate-100">
                          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                            <p className="text-sm text-slate-700">
                              {q.title}{' '}
                              <span className="text-xs text-slate-400">
                                · {q.questions?.length ?? 0} questions
                              </span>
                            </p>
                            <p className="flex items-center gap-2 text-xs text-slate-500">
                              {sits.length} sit{sits.length === 1 ? '' : 's'}
                              {avg !== null && (
                                <Badge variant={avg >= 50 ? 'success' : 'warn'}>avg {avg}%</Badge>
                              )}
                              {writtenIdx.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setGradingQuizId(isOpen ? null : q.id)}
                                  className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 font-semibold text-indigo-700 hover:bg-indigo-100"
                                >
                                  {isOpen ? 'Close marking' : `Mark written (${toMark.length})`}
                                </button>
                              )}
                            </p>
                          </div>

                          {/* ── Written-answer marking panel ── */}
                          {isOpen && (
                            <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 p-3">
                              {toMark.length === 0 ? (
                                <p className="text-sm text-slate-400">
                                  No written answers submitted yet.
                                </p>
                              ) : (
                                toMark.map((a) => {
                                  const gradedTotal = Object.values(a.grades ?? {}).reduce(
                                    (acc, v) => acc + (Number(v) || 0),
                                    0,
                                  )
                                  return (
                                    <div key={a.id} className="rounded-lg border border-slate-200 bg-white p-3">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-sm font-semibold text-slate-800">
                                          {a.studentName}
                                          <span className="ml-2 text-xs font-normal text-slate-400">
                                            auto-marked {a.score}/{a.total}
                                            {gradedTotal > 0 && ` · written +${gradedTotal} marks`}
                                          </span>
                                        </p>
                                        <Button size="sm" onClick={() => saveGrades(a)}>
                                          Save marks
                                        </Button>
                                      </div>
                                      {writtenIdx.map((qi) => {
                                        const text = a.answers?.[`${qi}`]
                                        if (!text) return null
                                        const qq = q.questions[qi]
                                        const draftVal =
                                          drafts[a.id]?.[`${qi}`] ?? a.grades?.[`${qi}`] ?? ''
                                        return (
                                          <div key={qi} className="mt-3 border-t border-slate-100 pt-2">
                                            <p className="text-xs font-medium text-slate-600">
                                              Q{qi + 1}. {qq.question}
                                              <span className="ml-2 text-slate-400">
                                                ({qq.marks ?? 1} mark{(qq.marks ?? 1) === 1 ? '' : 's'})
                                              </span>
                                            </p>
                                            <p className="mt-1 whitespace-pre-wrap rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
                                              {text}
                                            </p>
                                            <label className="mt-1.5 flex items-center gap-2 text-xs text-slate-500">
                                              Marks:
                                              <input
                                                type="number"
                                                min="0"
                                                max={qq.marks ?? 10}
                                                step="0.5"
                                                value={draftVal}
                                                onChange={(e) =>
                                                  setDrafts((d) => ({
                                                    ...d,
                                                    [a.id]: { ...(d[a.id] ?? {}), [`${qi}`]: e.target.value },
                                                  }))
                                                }
                                                className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm"
                                              />
                                            </label>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )
                                })
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Results */}
                {classAttempts.length > 0 && (
                  <>
                    <p className="label-caps mb-1">Latest results</p>
                    <ul className="card divide-y divide-slate-100">
                      {[...classAttempts]
                        .sort((a, b) => (b.completedAt?.seconds ?? 0) - (a.completedAt?.seconds ?? 0))
                        .slice(0, 10)
                        .map((a) => {
                          const pct = a.total > 0 ? Math.round((a.score / a.total) * 100) : null
                          const q = classQuizzes.find((x) => x.id === a.quizId)
                          return (
                            <li key={a.id} className="flex items-center justify-between px-3 py-2 text-sm">
                              <span className="text-slate-700">
                                {a.studentName} <span className="text-xs text-slate-400">· {q?.title ?? 'Quiz'}</span>
                              </span>
                              <span className="font-semibold text-slate-800">
                                {a.score}/{a.total}
                                {pct !== null && (
                                  <span className={`ml-2 text-xs ${pct >= 50 ? 'text-emerald-600' : 'text-amber-600'}`}>{pct}%</span>
                                )}
                              </span>
                            </li>
                          )
                        })}
                    </ul>
                  </>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
