import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dailyAnswer } from './game'
import { initialState, newPracticeGame, type State } from './state'
import { load, save, STORAGE_KEY } from './storage'

const DAY = 288

const played = (): State => {
  const s = initialState(DAY, () => 0)
  return {
    ...s,
    mode: 'practice',
    games: {
      daily: { ...s.games.daily, guesses: ['trace'], hardMode: true },
      practice: { ...newPracticeGame('crane', false), guesses: ['adieu', 'crane'] },
    },
    stats: { ...s.stats, practice: { ...s.stats.practice, played: 1, wins: 1, currentStreak: 1, maxStreak: 1, distribution: [0, 1, 0, 0, 0, 0] } },
    settings: { hardMode: true, highContrast: true },
  }
}

const saved = () => JSON.parse(localStorage.getItem(STORAGE_KEY)!)
const store = (value: unknown) => localStorage.setItem(STORAGE_KEY, JSON.stringify(value))

beforeEach(() => localStorage.clear())

describe('storage', () => {
  it('round-trips games, stats, settings and mode', () => {
    const state = played()
    save(state)
    const back = load(DAY)
    expect(back.mode).toBe('practice')
    expect(back.games).toEqual(state.games)
    expect(back.stats).toEqual(state.stats)
    expect(back.settings).toEqual(state.settings)
  })

  it('falls back to defaults on missing or corrupt data', () => {
    expect(load(DAY).games.daily).toMatchObject({ day: DAY, guesses: [], answer: dailyAnswer(DAY) })
    localStorage.setItem(STORAGE_KEY, '{nope')
    expect(load(DAY).stats.daily.played).toBe(0)
    store([1, 2])
    expect(load(DAY).mode).toBe('daily')
  })

  it("replaces yesterday's daily game with today's, in today's hard mode setting", () => {
    save(played())
    const next = load(DAY + 1)
    expect(next.games.daily).toEqual({ answer: dailyAnswer(DAY + 1), guesses: [], hardMode: true, day: DAY + 1 })
    expect(next.games.practice.guesses).toEqual(['adieu', 'crane'])
  })

  it('drops games with impossible guesses', () => {
    save(played())
    const data = saved()
    data.games.daily.guesses = ['zzzzz']
    data.games.practice.guesses = ['crane', 'adieu'] // play after a win
    store(data)
    const back = load(DAY, localStorage, () => 0)
    expect(back.games.daily.guesses).toEqual([])
    expect(back.games.practice).toMatchObject({ guesses: [], hardMode: true })

    data.games.practice = { answer: 'qqqqq', guesses: [], hardMode: false, day: null }
    store(data)
    expect(load(DAY).games.practice.answer).not.toBe('qqqqq')
  })

  it('resets malformed stats on their own', () => {
    save(played())
    const data = saved()
    data.stats.daily.distribution = [1, 2]
    data.stats.practice.played = -3
    data.settings = 'loud'
    store(data)
    const back = load(DAY)
    expect(back.stats.daily.distribution).toEqual([0, 0, 0, 0, 0, 0])
    expect(back.stats.practice.played).toBe(0)
    expect(back.settings).toEqual({ hardMode: false, highContrast: false })
    expect(back.games.practice.guesses).toEqual(['adieu', 'crane'])
  })

  it('survives storage that throws', () => {
    const broken = {
      getItem: vi.fn(() => {
        throw new Error('blocked')
      }),
      setItem: vi.fn(() => {
        throw new Error('full')
      }),
    } as unknown as Storage
    expect(() => save(played(), broken)).not.toThrow()
    expect(load(DAY, broken).games.daily.guesses).toEqual([])
  })
})
