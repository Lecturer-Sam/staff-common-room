import { useEffect, useState } from 'react'

export function useLoader(load, deps = []) {
  const [data, setData] = useState(undefined)
  const [error, setError] = useState(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let alive = true
    setData(undefined)
    setError(null)
    load().then(
      (d) => alive && setData(d),
      (e) => alive && setError(e),
    )
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  return { data, error, reload: () => setTick((t) => t + 1) }
}