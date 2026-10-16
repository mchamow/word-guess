import { ANSWERS } from './answers'
import { dailyAnswer, isValidWord, MAX_GUESSES } from './game'
import {
  emptyStats,
  initialState,
  newDailyGame,
  type Game,
  type Mode,
  type Settings,
  type State,
  type Stats,
} from './state'

export const STORAGE_KEY = 'word-guess'

interface Saved {
  mode: Mode
  games: Record<Mode, Game>
  stats: Record<Mode, Stats>
  settings: Settings
}

export function save(state: State, storage: Storage = localStorage): void {
  const { mode, games, stats, settings } = state
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ mode, games, stats, settings } satisfies Saved))
  } catch {
    // Storage full or blocked: the game still works, it just won't be remembered.
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0

function readGuesses(v: unknown, answer: string): string[] | null {
  if (!Array.isArray(v) || v.length > MAX_GUESSES) return null
  if (!v.every((g) => typeof g === 'string' && isValidWord(g) && g === g.toLowerCase())) return null
  // Nothing may follow a winning guess.
  const won = v.indexOf(answer)
  return won === -1 || won === v.length - 1 ? v : null
}

function readStats(v: unknown): Stats {
  if (!isRecord(v)) return emptyStats()
  const { played, wins, currentStreak, maxStreak, distribution, lastWonDay } = v
  if (![played, wins, currentStreak, maxStreak].every(isCount)) return emptyStats()
  if (!Array.isArray(distribution) || distribution.length !== MAX_GUESSES || !distribution.every(isCount)) {
    return emptyStats()
  }
  if (lastWonDay !== null && !Number.isInteger(lastWonDay)) return emptyStats()
  return {
    played: played as number,
    wins: wins as number,
    currentStreak: currentStreak as number,
    maxStreak: maxStreak as number,
    distribution: distribution as number[],
    lastWonDay: lastWonDay as number | null,
  }
}

/**
 * Restores the saved games, stats and settings, falling back to defaults part by part for anything
 * missing or malformed. Yesterday's daily game is replaced by today's.
 */
export function load(today: number, storage: Storage = localStorage, random: () => number = Math.random): State {
  const state = initialState(today, random)
  let raw: unknown
  try {
    raw = JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null')
  } catch {
    return state
  }
  if (!isRecord(raw)) return state

  if (isRecord(raw.settings)) {
    state.settings = {
      hardMode: raw.settings.hardMode === true,
      highContrast: raw.settings.highContrast === true,
    }
  }
  if (raw.mode === 'daily' || raw.mode === 'practice') state.mode = raw.mode
  if (isRecord(raw.stats)) state.stats = { daily: readStats(raw.stats.daily), practice: readStats(raw.stats.practice) }

  const games = isRecord(raw.games) ? raw.games : {}
  const daily = isRecord(games.daily) ? games.daily : {}
  const dailyGuesses = daily.day === today ? readGuesses(daily.guesses, dailyAnswer(today)) : null
  state.games.daily = dailyGuesses
    ? { ...newDailyGame(today, daily.hardMode === true), guesses: dailyGuesses }
    : newDailyGame(today, state.settings.hardMode)

  const practice = isRecord(games.practice) ? games.practice : {}
  const answer = typeof practice.answer === 'string' && ANSWERS.includes(practice.answer) ? practice.answer : null
  const practiceGuesses = answer ? readGuesses(practice.guesses, answer) : null
  state.games.practice =
    answer && practiceGuesses
      ? { answer, guesses: practiceGuesses, hardMode: practice.hardMode === true, day: null }
      : { ...state.games.practice, hardMode: state.settings.hardMode }
  return state
}
