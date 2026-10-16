import { useEffect, useReducer } from 'react'
import { msUntilTomorrow } from './game'

export function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((n) => String(n).padStart(2, '0')).join(':')
}

/** Time left until the next daily word as hh:mm:ss, re-rendering every second while `active`. */
export function useCountdown(active: boolean): string {
  const [, tick] = useReducer((n: number) => n + 1, 0)
  useEffect(() => {
    if (!active) return
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [active])
  return formatCountdown(msUntilTomorrow(new Date()))
}
