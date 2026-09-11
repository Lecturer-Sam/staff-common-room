import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { collection, getDocs, limit, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useCurriculum } from '../hooks/useCurriculum'
import { SkeletonGrid } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import { Button, Card, Select, PageHeader, Grid } from '../components/ui'

export default function Forecasts() {
  const { user } = useAuth()
  const { subjects } = useCurriculum()
  const [searchParams, setSearchParams] = useSearchParams()
  const [forecasts, setForecasts] = useState(null)

  const subjectFilter = searchParams.get('subject') || ''

  useEffect(() => {
    if (!user) return
    let active = true
    async function fetchForecasts() {
      const col = collection(db, 'weekly_forecasts')
      const snaps = await Promise.all([
        getDocs(query(col, where('visibility', '==', 'public'), limit(100))),
        getDocs(query(col, where('authorId', '==', user.uid), limit(100))),
      ])
      if (!active) return
      const map = new Map()
      for (const snap of snaps) {
        snap.forEach((d) => map.set(d.id, { id: d.id, ...d.data() }))
      }
      const list = [...map.values()]
        .filter((f) => f.visibility === 'public' || f.authorId === user.uid)
        .sort(
          (a, b) =>
            (a.subjectId ?? '').localeCompare(b.subjectId ?? '') ||
            a.term - b.term ||
            (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0),
        )
      setForecasts(list)
    }
    fetchForecasts()
    return () => {
      active = false
    }
  }, [user])

  const visible = useMemo(() => {
    if (!forecasts) return null
    return subjectFilter
      ? forecasts.filter((f) => f.subjectId === subjectFilter)
      : forecasts
  }, [forecasts, subjectFilter])

  const subjectName = (id) => subjects.find((s) => s.id === id)?.name ?? id

  return (
    <div>
      <PageHeader
        title="Schemes of Learning"
        subtitle="Termly schemes mapped to NaCCA indicators — download any scheme as a PDF for sharing."
        action={<Button to="/portal/forecasts/new">+ New scheme</Button>}
      />

      <div className="mb-4">
        <Select
          value={subjectFilter}
          onChange={(e) => {
            const next = new URLSearchParams(searchParams)
            if (e.target.value) next.set('subject', e.target.value)
            else next.delete('subject')
            setSearchParams(next)
          }}
          className="w-auto py-1.5"
        >
          <option value="">All subjects</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>

      {!visible ? (
        <SkeletonGrid count={6} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="document"
          title="No schemes of learning yet"
          body="Termly schemes mapped to NaCCA indicators will appear here."
          action={{ label: '+ New scheme', to: '/portal/forecasts/new' }}
        />
      ) : (
        <Grid as="ul">
          {visible.map((f) => (
            <Card
              as={Link}
              to={`/portal/forecasts/${f.id}`}
              key={f.id}
              hover
              padding="p-4"
              banner={
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold leading-snug">
                    {subjectName(f.subjectId)} — Term {f.term}
                    {f.kind !== 'scheme' && f.week != null && `, Week ${f.week}`}
                  </h2>
                  <span className="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold">
                    {f.grade}
                  </span>
                </div>
              }
            >
              <p className="text-xs text-slate-500">
                by {f.authorName}
                {f.visibility === 'private' && ' · Private'} ·{' '}
                {f.kind === 'scheme'
                  ? `${(f.rows ?? []).filter((r) => r.kind !== 'special').length} teaching weeks`
                  : 'older format'}
              </p>
            </Card>
          ))}
        </Grid>
      )}
    </div>
  )
}
