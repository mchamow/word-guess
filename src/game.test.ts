import { describe, expect, it } from 'vitest'
import { ANSWERS } from './answers'
import {
  checkGuess,
  dailyAnswer,
  dayIndex,
  hardModeViolation,
  isValidWord,
  letterMarks,
  msUntilTomorrow,
  randomAnswer,
  scoreGuess,
  shareText,
} from './game'

describe('scoreGuess', () => {
  it('marks right-spot, wrong-spot and missing letters', () => {
    expect(scoreGuess('trace', 'crane')).toEqual(['absent', 'correct', 'correct', 'present', 'correct'])
    expect(scoreGuess('crane', 'crane')).toEqual(Array(5).fill('correct'))
  })

  it('only marks as many copies of a letter as the answer has', () => {
    // abide has one e: the first e in speed takes it, the second is grey.
    expect(scoreGuess('speed', 'abide')).toEqual(['absent', 'absent', 'present', 'absent', 'present'])
  })

  it('gives a green copy priority over an earlier yellow one', () => {
    // there has two e's; the last e of eerie is green, the first is yellow, the second grey.
    expect(scoreGuess('eerie', 'there')).toEqual(['present', 'absent', 'present', 'absent', 'correct'])
    // one e in "crane": the green e at the end wins, the earlier e is grey.
    expect(scoreGuess('eerie', 'crane')).toEqual(['absent', 'absent', 'present', 'absent', 'correct'])
  })
})

describe('letterMarks', () => {
  it('keeps the best mark seen for each letter', () => {
    const marks = letterMarks(['trace', 'crate'], 'crane')
    expect(marks.get('c')).toBe('correct')
    expect(marks.get('t')).toBe('absent')
    expect(marks.get('r')).toBe('correct')
    expect(marks.has('z')).toBe(false)
  })
})

describe('hardModeViolation', () => {
  it('requires green letters to stay in place', () => {
    expect(hardModeViolation('brine', ['trace'], 'crane')).toBe('3rd letter must be A')
  })

  it('requires yellow letters to be used', () => {
    expect(hardModeViolation('grape', ['trace'], 'crane')).toBe('Guess must contain C')
    expect(hardModeViolation('crate', ['trace'], 'crane')).toBeNull()
  })

  it('counts repeated hints', () => {
    // eerie against sleep reveals two e's.
    expect(hardModeViolation('those', ['eerie'], 'sleep')).toBe('Guess must contain 2 Es')
    expect(hardModeViolation('theme', ['eerie'], 'sleep')).toBeNull()
  })

  it('allows anything before the first guess', () => {
    expect(hardModeViolation('zebra', [], 'crane')).toBeNull()
  })
})

describe('checkGuess', () => {
  it('explains what is wrong with a guess', () => {
    expect(checkGuess('cra', [], 'crane', false)).toBe('Not enough letters')
    expect(checkGuess('xqzzv', [], 'crane', false)).toBe('Not in word list')
    expect(checkGuess('grape', ['trace'], 'crane', false)).toBeNull()
    expect(checkGuess('grape', ['trace'], 'crane', true)).toBe('Guess must contain C')
  })
})

describe('word lists', () => {
  it('accepts dictionary words, plurals and every answer, in any case', () => {
    for (const word of ['trees', 'baked', 'audio', 'PIZZA', 'emoji']) expect(isValidWord(word)).toBe(true)
    expect(isValidWord('aeiou')).toBe(false)
    expect(ANSWERS.every(isValidWord)).toBe(true)
  })

  it('has unique, lowercase five-letter answers', () => {
    expect(ANSWERS.length).toBeGreaterThan(500)
    expect(new Set(ANSWERS).size).toBe(ANSWERS.length)
    expect(ANSWERS.every((w) => /^[a-z]{5}$/.test(w))).toBe(true)
  })
})

describe('daily word', () => {
  it('numbers local calendar days from 1 January 2026', () => {
    expect(dayIndex(new Date(2026, 0, 1, 0, 0))).toBe(0)
    expect(dayIndex(new Date(2026, 0, 1, 23, 59))).toBe(0)
    expect(dayIndex(new Date(2026, 9, 16, 9, 30))).toBe(288)
    // Across a daylight-saving change the count still goes up by one.
    expect(dayIndex(new Date(2026, 2, 30)) - dayIndex(new Date(2026, 2, 29))).toBe(1)
    expect(dayIndex(new Date(2026, 9, 26)) - dayIndex(new Date(2026, 9, 25))).toBe(1)
  })

  it('counts down to local midnight', () => {
    expect(msUntilTomorrow(new Date(2026, 9, 16, 23, 0, 0))).toBe(3_600_000)
  })

  it('deals every answer once before repeating, in a shuffled order', () => {
    const days = ANSWERS.map((_, day) => dailyAnswer(day))
    expect(new Set(days).size).toBe(ANSWERS.length)
    expect(days.slice(0, 20)).not.toEqual(ANSWERS.slice(0, 20))
    expect(dailyAnswer(ANSWERS.length + 3)).toBe(dailyAnswer(3))
    expect(dailyAnswer(-1)).toBe(dailyAnswer(ANSWERS.length - 1))
  })
})

describe('randomAnswer', () => {
  it('picks an answer, never the one just played', () => {
    expect(randomAnswer(() => 0)).toBe(ANSWERS[0])
    expect(randomAnswer(() => 0, ANSWERS[0])).toBe(ANSWERS[1])
    expect(ANSWERS).toContain(randomAnswer())
  })
})

describe('shareText', () => {
  const base = { answer: 'crane', hardMode: false, highContrast: false, puzzle: 289 }

  it('shows the puzzle, score and coloured rows without the letters', () => {
    expect(shareText({ ...base, guesses: ['trace', 'crane'], won: true })).toBe(
      'Word Guess #289 2/6\n\n⬛🟩🟩🟨🟩\n🟩🟩🟩🟩🟩',
    )
  })

  it('marks losses, hard mode, practice and high contrast', () => {
    const guesses = ['trace', 'trace', 'trace', 'trace', 'trace', 'trace']
    const text = shareText({ ...base, guesses, won: false, hardMode: true, highContrast: true, puzzle: null })
    expect(text.split('\n')[0]).toBe('Word Guess (practice) X/6*')
    expect(text.split('\n')[2]).toBe('⬛🟧🟧🟦🟧')
  })
})
