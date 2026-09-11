import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  collection,
  getDocs,
  query,
  where,
  limit,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useCurriculum } from '../hooks/useCurriculum'
import { SkeletonGrid } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import { Button, Card, Select, PageHeader, Grid } from '../components/ui'

export default function LessonPlans() {
  const { user } = useAuth()
  const { subjects, indicators } = useCurriculum()
  const [searchParams, setSearchParams] = useSearchParams()
  const [plans, setPlans] = useState(null)

  const subjectFilter = searchParams.get('subject') || ''
  const indicatorFilter = searchParams.get('indicator') || ''
  const indicatorObj = indicators.find((i) => i.id === indicatorFilter)

  useEffect(() => {
    if (!user) return
    let active = true
    async function fetchPlans() {
      const col = collection(db, 'lesson_plans')
      let snaps
      if (indicatorFilter) {
        // Two constrained queries so Firestore security rules can verify them
        snaps = await Promise.all([
          getDocs(
            query(
              col,
              where('indicatorIds', 'array-contains', indicatorFilter),
              where('visibility', '==', 'public'),
            ),
          ),
          getDocs(
            query(
              col,
              where('indicatorIds', 'array-contains', indicatorFilter),
              where('authorId', '==', user.uid),
            ),
          ),
        ])
      } else {
        snaps = await Promise.all([
          getDocs(query(col, where('visibility', '==', 'public'), limit(100))),
          getDocs(query(col, where('authorId', '==', user.uid), limit(100))),
        ])
      }
      if (!active) return
      const map = new Map()
      for (const snap of snaps) {
        snap.forEach((d) => map.set(d.id, { id: d.id, ...d.data() }))
      }
      const list = [...map.values()]
        .filter((p) => p.visibility === 'public' || p.authorId === user.uid)
        .sort(
          (a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0),
        )
      setPlans(list)
    }
    fetchPlans()
    return () => {
      active = false
    }
  }, [user, indicatorFilter])

  const visible = useMemo(() => {
    if (!plans) return null
    return subjectFilter
      ? plans.filter((p) => p.subjectId === subjectFilter)
      : plans
  }, [plans, subjectFilter])

  const subjectName = (id) => subjects.find((s) => s.id === id)?.name ?? id

  return (
    <div>
      <PageHeader
        title="Lesson Plans"
        subtitle="Shared by the network, tagged to NaCCA indicators."
        action={<Button to="/portal/plans/new">+ New plan</Button>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
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
        {indicatorObj && (
          <span className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
            Indicator {indicatorObj.code} ({indicatorObj.subjectName})
            <button
              type="button"
              onClick={() => {
                const next = new URLSearchParams(searchParams)
                next.delete('indicator')
                setSearchParams(next)
              }}
              className="ml-1 font-bold hover:text-amber-900"
              aria-label="Clear indicator filter"
            >
              ×
            </button>
          </span>
        )}
      </div>

      {!visible ? (
        <SkeletonGrid count={6} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="document"
          title={indicatorObj ? 'No plans for this indicator yet' : 'No lesson plans yet'}
          body="Lesson plans shared by the network appear here, tagged to curriculum indicators."
          action={{ label: '+ New plan', to: '/portal/plans/new' }}
        />
      ) : (
        <Grid as="ul">
          {visible.map((p) => (
            <Card
              as={Link}
              to={`/portal/plans/${p.id}`}
              key={p.id}
              hover
              padding="p-4"
              banner={
                <div className="flex items-start justify-between gap-2">
                  <h2 className="line-clamp-2 font-semibold leading-snug">{p.title}</h2>
                  <span className="shrink-0 text-[11px] text-white/80">
                    {p.createdAt?.toDate
                      ? p.createdAt.toDate().toLocaleDateString()
                      : ''}
                  </span>
                </div>
              }
            >
              <p className="card-meta">
                {subjectName(p.subjectId)} · by {p.authorName}
                {p.visibility === 'private' && ' · Private'}
              </p>
              {p.indicatorIds?.length > 0 && (
                <p className="mt-2 flex flex-wrap gap-1">
                  {p.indicatorIds.map((id) => (
                    <span
                      key={id}
                      className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600"
                    >
                      {id.split('_')[1] ?? id}
                    </span>
                  ))}
                </p>
              )}
            </Card>
          ))}
        </Grid>
      )}
    </div>
  )
}
