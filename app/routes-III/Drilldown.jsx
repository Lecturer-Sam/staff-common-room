import { useEffect } from 'react'
import { Link, useParams } from 'react-router'
import { CheckCircle2 } from 'lucide-react'
import { db } from '../db/dexie'
import { getStrands, getSubStrands, getStandards, getStandardsForStrand, getQuestionsForStrand } from '../lib/aggregate'
import { useLoader } from '../lib/useLoader'
import { Card, PageShell, Loading, ErrorCard, Chip } from '../components/ui'
import { SubjectIcon } from '../components/drilldown/subjectIcons'
import { useDrilldownStore } from '../stores/drilldownStore'

export function SubjectLevel() {
  const { classId } = useParams()
  const { data, error, reload } = useLoader(async () => {
    const [klass, subjects, questions] = await Promise.all([
      db.classes.get(classId),
      db.subjects.orderBy('code').toArray(),
      db.questions.filter((q) => q.classId === classId).toArray(),
    ])
    if (!klass) throw new Error(`Unknown class: ${classId}`)
    return {
      klass,
      rows: subjects.map((s) => ({ ...s, count: questions.filter((q) => q.subjectId === s.id).length })),
    }
  }, [classId])

  if (error) return <ErrorCard error={error} onRetry={reload} />
  if (!data) return <Loading />
  const { klass, rows } = data
  return (
    <PageShell trail={[{ label: 'Home', to: '/' }, { label: klass.name }]} title="Choose a subject">
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((s) => (
          <Card key={s.id} to={`/strands/${classId}/${s.id}`} accent={s.colour}
            lead={<SubjectIcon name={s.icon} size={20} />}
            title={s.name} subtitle={s.blurb} meta={`${s.code} · ${s.count} Qs`} />
        ))}
      </div>
    </PageShell>
  )
}

export function StrandLevel() {
  const { classId, subjectId } = useParams()
  const { data, error, reload } = useLoader(async () => {
    const [klass, subject, strands] = await Promise.all([
      db.classes.get(classId),
      db.subjects.get(subjectId),
      getStrands(classId, subjectId),
    ])
    if (!klass || !subject) throw new Error('Unknown class or subject')
    const rows = await Promise.all(strands.map(async (st) => ({
      ...st,
      count: (await getQuestionsForStrand(st.id)).length,
    })))
    return { klass, subject, rows }
  }, [classId, subjectId])

  if (error) return <ErrorCard error={error} onRetry={reload} />
  if (!data) return <Loading />
  const { klass, subject, rows } = data
  return (
    <PageShell
      trail={[
        { label: 'Home', to: '/' },
        { label: klass.name, to: `/subjects/${classId}` },
        { label: subject.name },
      ]}
      title={subject.name}>
      <div className="grid gap-3">
        {rows.map((st) => (
          <Card key={st.id} to={`/sub-stands/${st.id}`} accent={subject.colour}
            lead={<span className="text-xs font-bold">{st.code}</span>}
            title={`${st.num}. ${st.name}`} meta={`${st.count} Qs`} />
        ))}
      </div>
    </PageShell>
  )
}

export function SubStrandLevel() {
  const { strandId } = useParams()
  const { data, error, reload } = useLoader(async () => {
    const strand = await db.strands.get(strandId)
    if (!strand) throw new Error('Unknown strand')
    const [klass, subject, subStrands] = await Promise.all([
      db.classes.get(strand.classId),
      db.subjects.get(strand.subjectId),
      getSubStrands(strandId),
    ])
    const rows = await Promise.all(subStrands.map(async (ss) => {
      const standards = await getStandards(ss.id)
      const count = standards.length
        ? await db.questions.where('csId').anyOf(standards.map((s) => s.id)).count()
        : 0
      return { ...ss, count }
    }))
    return { strand, klass, subject, rows }
  }, [strandId])

  if (error) return <ErrorCard error={error} onRetry={reload} />
  if (!data) return <Loading />
  const { strand, klass, subject, rows } = data
  return (
    <PageShell
      trail={[
        { label: 'Home', to: '/' },
        { label: klass.name, to: `/subjects/${klass.id}` },
        { label: subject.name, to: `/strands/${klass.id}/${subject.id}` },
        { label: strand.name },
      ]}
      title={`${strand.num}. ${strand.name}`}>
      <div className="grid gap-3">
        {rows.map((ss) => (
          <Card key={ss.id} to={`/standards/${strandId}/${ss.id}`} accent={subject.colour}
            lead={<span className="text-sm font-bold">{ss.num}</span>}
            title={ss.name} subtitle={ss.code} meta={`${ss.count} Qs`} />
        ))}
      </div>
    </PageShell>
  )
}

export function StandardsLevel() {
  const { strandId, subStrandId } = useParams()
  const { data, error, reload } = useLoader(async () => {
    const [subStrand, strand] = await Promise.all([db.subStrands.get(subStrandId), db.strands.get(strandId)])
    if (!subStrand || !strand) throw new Error('Unknown sub-strand')
    const [klass, subject, standards] = await Promise.all([
      db.classes.get(subStrand.classId),
      db.subjects.get(subStrand.subjectId),
      getStandards(subStrandId),
    ])
    const rows = await Promise.all(standards.map(async (std) => ({
      ...std,
      count: await db.questions.where('csId').equals(std.id).count(),
    })))
    return { klass, subject, strand, subStrand, rows }
  }, [strandId, subStrandId])

  if (error) return <ErrorCard error={error} onRetry={reload} />
  if (!data) return <Loading />
  const { klass, subject, strand, subStrand, rows } = data
  return (
    <PageShell
      trail={[
        { label: 'Home', to: '/' },
        { label: klass.name, to: `/subjects/${klass.id}` },
        { label: subject.name, to: `/strands/${klass.id}/${subject.id}` },
        { label: strand.name, to: `/sub-stands/${strand.id}` },
        { label: subStrand.name },
      ]}
      title={subStrand.name}>
      <div className="grid gap-3">
        {rows.map((std) => (
          <Card key={std.id} to={`/standards/${strandId}/${subStrandId}/${std.id}`} accent={subject.colour}
            lead={<span className="text-[10px] font-bold">{std.code}</span>}
            title={std.title} meta={`${std.count} Qs`} />
        ))}
      </div>
    </PageShell>
  )
}

export function StandardDetail() {
  const { strandId, subStrandId, standardId } = useParams()
  const { data, error, reload } = useLoader(async () => {
    const standard = await db.contentStandards.get(standardId)
    if (!standard) throw new Error('Unknown standard')
    const [subStrand, strand, klass, subject, count] = await Promise.all([
      db.subStrands.get(subStrandId),
      db.strands.get(strandId),
      db.classes.get(standard.classId),
      db.subjects.get(standard.subjectId),
      db.questions.where('csId').equals(standardId).count(),
    ])
    return { standard, subStrand, strand, klass, subject, count }
  }, [strandId, subStrandId, standardId])

  // "Continue learning" memory — non-reactive write, getState() is the right pattern here
  useEffect(() => {
    if (data) useDrilldownStore.getState().visitStandard(
      data.standard.id,
      `/standards/${strandId}/${subStrandId}/${standardId}`,
    )
  }, [data, strandId, subStrandId, standardId])

  if (error) return <ErrorCard error={error} onRetry={reload} />
  if (!data) return <Loading />
  const { standard, subStrand, strand, klass, subject, count } = data

  return (
    <PageShell
      trail={[
        { label: 'Home', to: '/' },
        { label: klass.name, to: `/subjects/${klass.id}` },
        { label: subject.name, to: `/strands/${klass.id}/${subject.id}` },
        { label: strand.name, to: `/sub-stands/${strand.id}` },
        { label: subStrand.name, to: `/standards/${strand.id}/${subStrand.id}` },
        { label: standard.code },
      ]}
      title={standard.title}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Chip>{standard.code}</Chip>
          <Chip>{subject.name}</Chip>
          <Chip>{count} questions</Chip>
        </div>
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-500">The learner will be able to…</h2>
          <ul className="mt-2 space-y-2">
            {standard.indicators.map((ind, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-brand" />
                {ind}
              </li>
            ))}
          </ul>
        </section>
        {standard.coreCompetencies.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {standard.coreCompetencies.map((c) => <Chip key={c}>{c}</Chip>)}
          </div>
        )}
        <Link to={`/quiz/${standardId}`}
          className="block rounded-2xl bg-brand py-3 text-center font-semibold text-white shadow-sm transition hover:opacity-90">
          Start Practice ({count} questions)
        </Link>
      </div>
    </PageShell>
  )
}