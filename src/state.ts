import {
  checkGuess,
  dailyAnswer,
  MAX_GUESSES,
  PRAISE,
  randomAnswer,
  WORD_LENGTH,
} from './game'

export type Mode = 'daily' | 'practice'
export type Status = 'playing' | 'won' | 'lost'

export interface Game {
  answer: string
  guesses: string[]
  /** Fixed once the first guess is in; follows the setting until then. */
  hardMode: boolean
  /** The daily puzzle's day index, or null for practice. */
  day: number | null
}

export interface Stats {
  played: number
  wins: number
  currentStreak: number
  maxStreak: number
  /** distribution[i] = games won in i + 1 guesses */
  distribution: number[]
  /** Daily only: the day of the last win, to tell whether the streak is still alive. */
  lastWonDay: number | null
}

export interface Settings {
  hardMode: boolean
  highContrast: boolean
}

export interface Message {
  text: string
  id: number
}

export interface State {
  mode: Mode
  games: Record<Mode, Game>
  stats: Record<Mode, Stats>
  settings: Settings
  /** The letters typed into the current row. */
  current: string
  message: Message | null
  /** Bumped on a rejected guess, to shake the row. */
  shake: number
  /** Bumped when a game ends, so the app can show the stats once the row has flipped. */
  finished: number
}

export type Action =
  | { type: 'type'; letter: string }
  | { type: 'delete' }
  | { type: 'submit' }
  | { type: 'setMode'; mode: Mode }
  | { type: 'newPractice'; answer: string }
  | { type: 'newDay'; day: number }
  | { type: 'setHardMode'; on: boolean }
  | { type: 'setHighContrast'; on: boolean }
  | { type: 'notify'; text: string }
  | { type: 'dismissMessage'; id: number }

export function gameStatus(game: Game): Status {
  if (game.guesses.at(-1) === game.answer) return 'won'
  return game.guesses.length >= MAX_GUESSES ? 'lost' : 'playing'
}

export const emptyStats = (): Stats => ({
  played: 0,
  wins: 0,
  currentStreak: 0,
  maxStreak: 0,
  distribution: Array(MAX_GUESSES).fill(0),
  lastWonDay: null,
})

export const newDailyGame = (day: number, hardMode: boolean): Game => ({
  answer: dailyAnswer(day),
  guesses: [],
  hardMode,
  day,
})

export const newPracticeGame = (answer: string, hardMode: boolean): Game => ({
  answer,
  guesses: [],
  hardMode,
  day: null,
})

export function initialState(today: number, random: () => number = Math.random): State {
  return {
    mode: 'daily',
    games: { daily: newDailyGame(today, false), practice: newPracticeGame(randomAnswer(random), false) },
    stats: { daily: emptyStats(), practice: emptyStats() },
    settings: { hardMode: false, highContrast: false },
    current: '',
    message: null,
    shake: 0,
    finished: 0,
  }
}

/** Records a finished game. A daily streak only grows on consecutive days. */
export function recordResult(stats: Stats, game: Game): Stats {
  const won = gameStatus(game) === 'won'
  const next = { ...stats, played: stats.played + 1, distribution: [...stats.distribution] }
  if (!won) return { ...next, currentStreak: 0 }
  next.wins++
  next.distribution[game.guesses.length - 1]++
  const continues = game.day === null || (stats.lastWonDay !== null && stats.lastWonDay === game.day - 1)
  next.currentStreak = continues ? stats.currentStreak + 1 : 1
  next.maxStreak = Math.max(stats.maxStreak, next.currentStreak)
  if (game.day !== null) next.lastWonDay = game.day
  return next
}

/** The streak to show today: a daily streak breaks once a whole day passes without a win. */
export function liveStreak(stats: Stats, mode: Mode, today: number): number {
  if (mode === 'practice') return stats.currentStreak
  return stats.lastWonDay !== null && stats.lastWonDay >= today - 1 ? stats.currentStreak : 0
}

let messageId = 0
const message = (text: string): Message => ({ text, id: ++messageId })

export function reducer(state: State, action: Action): State {
  const game = state.games[state.mode]
  const playing = gameStatus(game) === 'playing'

  switch (action.type) {
    case 'type': {
      const letter = action.letter.toLowerCase()
      if (!playing || !/^[a-z]$/.test(letter) || state.current.length >= WORD_LENGTH) return state
      return { ...state, current: state.current + letter }
    }

    case 'delete':
      if (!playing || !state.current) return state
      return { ...state, current: state.current.slice(0, -1) }

    case 'submit': {
      if (!playing) return state
      const problem = checkGuess(state.current, game.guesses, game.answer, game.hardMode)
      if (problem) return { ...state, message: message(problem), shake: state.shake + 1 }

      const played: Game = { ...game, guesses: [...game.guesses, state.current] }
      const status = gameStatus(played)
      const next: State = { ...state, games: { ...state.games, [state.mode]: played }, current: '' }
      if (status === 'playing') return next
      return {
        ...next,
        stats: { ...state.stats, [state.mode]: recordResult(state.stats[state.mode], played) },
        message:
          status === 'won'
            ? message(PRAISE[played.guesses.length - 1])
            : message(game.answer.toUpperCase()),
        finished: state.finished + 1,
      }
    }

    case 'setMode':
      if (action.mode === state.mode) return state
      return { ...state, mode: action.mode, current: '', message: null }

    case 'newPractice':
      return {
        ...state,
        mode: 'practice',
        games: { ...state.games, practice: newPracticeGame(action.answer, state.settings.hardMode) },
        current: '',
        message: null,
      }

    case 'newDay': {
      if (state.games.daily.day === action.day) return state
      return {
        ...state,
        games: { ...state.games, daily: newDailyGame(action.day, state.settings.hardMode) },
        current: state.mode === 'daily' ? '' : state.current,
        message: state.mode === 'daily' ? null : state.message,
      }
    }

    case 'setHardMode': {
      if (action.on && playing && game.guesses.length > 0) {
        return { ...state, message: message('Hard mode can only be turned on at the start of a round') }
      }
      // Games not started yet pick the change up; a game in progress can only drop hard mode.
      const follow = (g: Game): Game =>
        g.guesses.length === 0 || (!action.on && gameStatus(g) === 'playing') ? { ...g, hardMode: action.on } : g
      return {
        ...state,
        settings: { ...state.settings, hardMode: action.on },
        games: { daily: follow(state.games.daily), practice: follow(state.games.practice) },
      }
    }

    case 'setHighContrast':
      return { ...state, settings: { ...state.settings, highContrast: action.on } }

    case 'notify':
      return { ...state, message: message(action.text) }

    case 'dismissMessage':
      if (state.message?.id !== action.id) return state
      return { ...state, message: null }
  }
}
