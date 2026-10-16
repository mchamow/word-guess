import { describe, expect, it } from 'vitest'
import { dailyAnswer } from './game'
import {
  emptyStats,
  gameStatus,
  initialState,
  liveStreak,
  newPracticeGame,
  recordResult,
  reducer,
  type Action,
  type Game,
  type State,
} from './state'

const DAY = 288
const start = (): State => {
  const s = initialState(DAY, () => 0)
  return { ...s, games: { ...s.games, practice: newPracticeGame('crane', false) } }
}

const run = (state: State, ...actions: Action[]) => actions.reduce(reducer, state)
const guess = (word: string): Action[] => [...[...word].map((letter) => ({ type: 'type', letter }) as Action), { type: 'submit' }]
const practice = (s: State) => run(s, { type: 'setMode', mode: 'practice' })

describe('typing', () => {
  it('types up to five letters, lowercased, and deletes', () => {
    let s = run(start(), ...'CRANES'.split('').map((letter) => ({ type: 'type', letter }) as Action))
    expect(s.current).toBe('crane')
    s = run(s, { type: 'delete' }, { type: 'type', letter: '1' })
    expect(s.current).toBe('cran')
  })
})

describe('submitting', () => {
  it('rejects bad guesses with a message and a shake, keeping the letters', () => {
    let s = run(practice(start()), { type: 'type', letter: 'c' }, { type: 'submit' })
    expect(s.message?.text).toBe('Not enough letters')
    expect(s.shake).toBe(1)
    s = run(s, ...guess('rqzz'))
    expect(s.message?.text).toBe('Not in word list')
    expect(s.current).toBe('crqzz')
    expect(s.games.practice.guesses).toEqual([])
  })

  it('adds a valid guess and clears the row', () => {
    const s = run(practice(start()), ...guess('trace'))
    expect(s.games.practice.guesses).toEqual(['trace'])
    expect(s.current).toBe('')
    expect(s.finished).toBe(0)
  })

  it('wins, praises, records the result and stops taking input', () => {
    let s = run(practice(start()), ...guess('trace'), ...guess('crane'))
    expect(gameStatus(s.games.practice)).toBe('won')
    expect(s.message?.text).toBe('Magnificent')
    expect(s.finished).toBe(1)
    expect(s.stats.practice).toMatchObject({ played: 1, wins: 1, currentStreak: 1, distribution: [0, 1, 0, 0, 0, 0] })
    s = run(s, { type: 'type', letter: 'a' })
    expect(s.current).toBe('')
  })

  it('loses after six misses and shows the answer', () => {
    const s = run(practice(start()), ...Array(6).fill(guess('trace')).flat())
    expect(gameStatus(s.games.practice)).toBe('lost')
    expect(s.message?.text).toBe('CRANE')
    expect(s.stats.practice).toMatchObject({ played: 1, wins: 0, currentStreak: 0 })
  })

  it('enforces hard mode', () => {
    const s = run(practice(start()), { type: 'setHardMode', on: true }, ...guess('trace'), ...guess('grape'))
    expect(s.message?.text).toBe('Guess must contain C')
    expect(s.games.practice.guesses).toEqual(['trace'])
  })
})

describe('modes and games', () => {
  it('keeps a game per mode and clears the typed row on switching', () => {
    let s = run(start(), { type: 'type', letter: 'a' }, { type: 'setMode', mode: 'practice' })
    expect(s.current).toBe('')
    s = run(s, ...guess('trace'), { type: 'setMode', mode: 'daily' })
    expect(s.games.practice.guesses).toEqual(['trace'])
    expect(s.games.daily.guesses).toEqual([])
    expect(s.games.daily.answer).toBe(dailyAnswer(DAY))
  })

  it('deals a new practice word', () => {
    const s = run(start(), ...guess('trace'), { type: 'newPractice', answer: 'zebra' })
    expect(s.mode).toBe('practice')
    expect(s.games.practice).toMatchObject({ answer: 'zebra', guesses: [] })
  })

  it("starts the new day's daily game, once", () => {
    let s = run(start(), ...guess('trace'))
    s = run(s, { type: 'newDay', day: DAY })
    expect(s.games.daily.guesses).toEqual(['trace'])
    s = run(s, { type: 'newDay', day: DAY + 1 })
    expect(s.games.daily).toMatchObject({ day: DAY + 1, guesses: [], answer: dailyAnswer(DAY + 1) })
  })
})

describe('hard mode setting', () => {
  it("can't be turned on mid-game, but can be turned off", () => {
    let s = run(practice(start()), ...guess('trace'), { type: 'setHardMode', on: true })
    expect(s.settings.hardMode).toBe(false)
    expect(s.message?.text).toMatch(/start of a round/)

    s = run(practice(start()), { type: 'setHardMode', on: true }, ...guess('trace'))
    expect(s.games.practice.hardMode).toBe(true)
    s = run(s, { type: 'setHardMode', on: false })
    expect(s.games.practice.hardMode).toBe(false)
  })

  it('applies to games that have not started', () => {
    const s = run(practice(start()), ...guess('trace'), { type: 'setMode', mode: 'daily' }, { type: 'setHardMode', on: true })
    expect(s.games.daily.hardMode).toBe(true)
    expect(s.games.practice.hardMode).toBe(false)
  })
})

describe('stats', () => {
  const daily = (day: number, guesses: string[]): Game => ({ answer: 'crane', guesses, hardMode: false, day })

  it('grows a daily streak only on consecutive days', () => {
    let stats = recordResult(emptyStats(), daily(10, ['crane']))
    stats = recordResult(stats, daily(11, ['trace', 'crane']))
    expect(stats).toMatchObject({ played: 2, wins: 2, currentStreak: 2, maxStreak: 2, lastWonDay: 11 })
    stats = recordResult(stats, daily(13, ['crane']))
    expect(stats).toMatchObject({ currentStreak: 1, maxStreak: 2 })
    stats = recordResult(stats, daily(14, Array(6).fill('trace')))
    expect(stats).toMatchObject({ played: 4, wins: 3, currentStreak: 0, maxStreak: 2 })
  })

  it('shows a daily streak as broken once a day is missed', () => {
    const stats = { ...emptyStats(), currentStreak: 4, lastWonDay: 10 }
    expect(liveStreak(stats, 'daily', 10)).toBe(4)
    expect(liveStreak(stats, 'daily', 11)).toBe(4)
    expect(liveStreak(stats, 'daily', 12)).toBe(0)
    expect(liveStreak({ ...stats, lastWonDay: null }, 'practice', 99)).toBe(4)
  })
})

describe('messages', () => {
  it('dismisses only the message it was asked to', () => {
    const s = run(practice(start()), { type: 'submit' })
    const id = s.message!.id
    expect(run(s, { type: 'dismissMessage', id: id - 1 }).message).not.toBeNull()
    expect(run(s, { type: 'dismissMessage', id }).message).toBeNull()
    expect(run(s, { type: 'notify', text: 'Copied' }).message?.text).toBe('Copied')
  })
})
