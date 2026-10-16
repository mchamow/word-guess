import { ANSWERS } from './answers'
import { WORDS } from './words'

export const WORD_LENGTH = 5
export const MAX_GUESSES = 6

export type Mark = 'correct' | 'present' | 'absent'

export const MARK_LABEL: Record<Mark, string> = {
  correct: 'correct',
  present: 'in the word',
  absent: 'not in the word',
}

export const FLIP_STAGGER_MS = 250
/** How long a submitted row takes to finish flipping (each tile flips for 500ms). */
export const REVEAL_MS = FLIP_STAGGER_MS * (WORD_LENGTH - 1) + 500

const VALID = new Set<string>()
for (let i = 0; i < WORDS.length; i += WORD_LENGTH) VALID.add(WORDS.slice(i, i + WORD_LENGTH))

export function isValidWord(word: string): boolean {
  return VALID.has(word.toLowerCase())
}

/**
 * Marks each letter of a guess. Greens are placed first; a letter is yellow only while the answer
 * still has unclaimed copies of it, so guessing "speed" against "abide" gives one yellow e, not two.
 */
export function scoreGuess(guess: string, answer: string): Mark[] {
  const marks: Mark[] = Array(WORD_LENGTH).fill('absent')
  const left = new Map<string, number>()
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guess[i] === answer[i]) marks[i] = 'correct'
    else left.set(answer[i], (left.get(answer[i]) ?? 0) + 1)
  }
  for (let i = 0; i < WORD_LENGTH; i++) {
    const n = left.get(guess[i]) ?? 0
    if (marks[i] !== 'correct' && n > 0) {
      marks[i] = 'present'
      left.set(guess[i], n - 1)
    }
  }
  return marks
}

const RANK: Record<Mark, number> = { absent: 0, present: 1, correct: 2 }

/** The best thing known about each letter guessed so far, for colouring the keyboard. */
export function letterMarks(guesses: string[], answer: string): Map<string, Mark> {
  const best = new Map<string, Mark>()
  for (const guess of guesses) {
    scoreGuess(guess, answer).forEach((mark, i) => {
      const prev = best.get(guess[i])
      if (!prev || RANK[mark] > RANK[prev]) best.set(guess[i], mark)
    })
  }
  return best
}

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th']

/**
 * Hard mode: every revealed hint must be used. Greens stay in place, and each yellow or green letter
 * appears at least as many times as it was revealed. Returns why `guess` breaks that, or null.
 */
export function hardModeViolation(guess: string, guesses: string[], answer: string): string | null {
  for (const prev of guesses) {
    const marks = scoreGuess(prev, answer)
    for (let i = 0; i < WORD_LENGTH; i++) {
      if (marks[i] === 'correct' && guess[i] !== prev[i]) {
        return `${ORDINALS[i]} letter must be ${prev[i].toUpperCase()}`
      }
    }
    const needed = new Map<string, number>()
    marks.forEach((mark, i) => {
      if (mark !== 'absent') needed.set(prev[i], (needed.get(prev[i]) ?? 0) + 1)
    })
    for (const [letter, n] of needed) {
      if ([...guess].filter((c) => c === letter).length < n) {
        return `Guess must contain ${n > 1 ? `${n} ${letter.toUpperCase()}s` : letter.toUpperCase()}`
      }
    }
  }
  return null
}

/** Why a guess can't be submitted, or null if it can. */
export function checkGuess(guess: string, guesses: string[], answer: string, hardMode: boolean): string | null {
  if (guess.length < WORD_LENGTH) return 'Not enough letters'
  if (!isValidWord(guess)) return 'Not in word list'
  return hardMode ? hardModeViolation(guess, guesses, answer) : null
}

// Day 0 of the daily puzzle; puzzle numbers count from 1.
const EPOCH = Date.UTC(2026, 0, 1)

/** Whole days since the epoch for the local calendar date of `date`. */
export function dayIndex(date: Date): number {
  return Math.round((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - EPOCH) / 86_400_000)
}

/** Milliseconds until the next local midnight, when the daily word changes. */
export function msUntilTomorrow(now: Date): number {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return midnight.getTime() - now.getTime()
}

function mulberry32(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// The daily order: the answers shuffled once with a fixed seed, then dealt one per day.
const DAILY_ORDER = (() => {
  const words = [...ANSWERS]
  const random = mulberry32(26)
  for (let i = words.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[words[i], words[j]] = [words[j], words[i]]
  }
  return words
})()

export function dailyAnswer(day: number): string {
  const n = DAILY_ORDER.length
  return DAILY_ORDER[((day % n) + n) % n]
}

export function randomAnswer(random: () => number = Math.random, not?: string): string {
  let word = ANSWERS[Math.floor(random() * ANSWERS.length)]
  // Never deal the word just played twice in a row.
  if (word === not) word = ANSWERS[(ANSWERS.indexOf(word) + 1) % ANSWERS.length]
  return word
}

const EMOJI: Record<Mark, string> = { correct: '🟩', present: '🟨', absent: '⬛' }
const CONTRAST_EMOJI: Record<Mark, string> = { correct: '🟧', present: '🟦', absent: '⬛' }

export interface ShareInput {
  guesses: string[]
  answer: string
  won: boolean
  hardMode: boolean
  highContrast: boolean
  /** Daily puzzle number, or null for a practice word. */
  puzzle: number | null
}

/** The spoiler-free result: a header line and one row of coloured squares per guess. */
export function shareText({ guesses, answer, won, hardMode, highContrast, puzzle }: ShareInput): string {
  const emoji = highContrast ? CONTRAST_EMOJI : EMOJI
  const title = puzzle === null ? 'Word Guess (practice)' : `Word Guess #${puzzle}`
  const score = `${won ? guesses.length : 'X'}/${MAX_GUESSES}${hardMode ? '*' : ''}`
  const rows = guesses.map((g) => scoreGuess(g, answer).map((m) => emoji[m]).join(''))
  return [`${title} ${score}`, '', ...rows].join('\n')
}

export const PRAISE = ['Genius', 'Magnificent', 'Impressive', 'Splendid', 'Great', 'Phew']
