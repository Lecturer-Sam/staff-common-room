/**
 * Reusable skeleton shimmer primitives.
 *
 * Usage:
 *   <Skeleton />                        – single line, full width
 *   <Skeleton width="w-1/2" />          – half-width line
 *   <Skeleton height="h-24" />          – taller block (textarea / image)
 *   <SkeletonCard />                    – white card with a few skeleton lines
 *   <SkeletonList count={4} />          – N stacked skeleton cards
 */

function Skeleton({ width = 'w-full', height = 'h-4', className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200 ${width} ${height} ${className}`}
    />
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <Skeleton width="w-1/3" height="h-3" />
        <Skeleton width="w-16" height="h-3" />
      </div>
      <Skeleton height="h-3" className="mt-3" />
      <Skeleton width="w-5/6" height="h-3" className="mt-2" />
      <Skeleton width="w-2/3" height="h-3" className="mt-2" />
    </div>
  )
}

function SkeletonList({ count = 4 }) {
  return (
    <ul className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i}>
          <SkeletonCard />
        </li>
      ))}
    </ul>
  )
}

function SkeletonGrid({ count = 6, cols = 'sm:grid-cols-2 lg:grid-cols-3' }) {
  return (
    <div className={`grid gap-4 ${cols}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <Skeleton width="w-3/4" height="h-4" />
          <Skeleton width="w-1/2" height="h-3" className="mt-3" />
          <Skeleton width="w-1/3" height="h-3" className="mt-2" />
        </div>
      ))}
    </div>
  )
}

export { Skeleton, SkeletonCard, SkeletonList, SkeletonGrid }
