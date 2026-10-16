import { describe, expect, it } from 'vitest'
import { formatCountdown } from './countdown'

describe('formatCountdown', () => {
  it('formats hours, minutes and seconds, rounding up', () => {
    expect(formatCountdown(3_600_000)).toBe('01:00:00')
    expect(formatCountdown(86_399_001)).toBe('24:00:00')
    expect(formatCountdown(61_500)).toBe('00:01:02')
    expect(formatCountdown(-5)).toBe('00:00:00')
  })
})
