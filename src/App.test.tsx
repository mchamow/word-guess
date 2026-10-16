import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ANSWERS } from './answers'
import App from './App'
import { dailyAnswer, dayIndex } from './game'
import { STORAGE_KEY } from './storage'

const today = () => dailyAnswer(dayIndex(new Date()))
/** Six valid words other than the answer. */
const misses = (answer: string) => ANSWERS.filter((w) => w !== answer).slice(0, 6)

const row = (n: number) => screen.getByRole('group', { name: `Guess ${n}` })
const tiles = (n: number) => within(row(n)).getAllByRole('img').map((t) => t.getAttribute('aria-label'))
const letters = (n: number) => within(row(n)).getAllByRole('img').map((t) => t.textContent).join('')
const button = (name: string) => screen.getByRole('button', { name })
const key = (name: string) => within(screen.getByRole('group', { name: 'Keyboard' })).getByRole('button', { name })
const status = () => screen.getByRole('status').textContent
const press = (k: string) => fireEvent.keyDown(window, { key: k })
const type = (word: string) => [...word].forEach(press)
const guess = (word: string) => {
  type(word)
  press('Enter')
}

let writeText: ReturnType<typeof vi.fn>

beforeEach(() => {
  localStorage.clear()
  // Mark the visitor as returning so the help dialog doesn't open over every test.
  localStorage.setItem(STORAGE_KEY, '{}')
  writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  // Reduced motion: the stats open soon after a game ends instead of after the flip.
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), addEventListener() {}, removeEventListener() {} }))
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  document.documentElement.classList.remove('high-contrast')
})

describe('App', () => {
  it('opens the help on the first visit only', () => {
    localStorage.clear()
    render(<App />)
    expect(screen.getByRole('dialog', { name: 'How to play' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    cleanup()
    render(<App />)
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(button('How to play'))
    expect(screen.getByRole('dialog', { name: 'How to play' })).toBeTruthy()
  })

  it('types with the physical keyboard and deletes with Backspace', () => {
    render(<App />)
    type('crx')
    expect(letters(1)).toBe('crx')
    expect(tiles(1)).toEqual(['C', 'R', 'X', 'empty', 'empty'])
    press('Backspace')
    expect(letters(1)).toBe('cr')
  })

  it('types and submits with the on-screen keyboard', () => {
    render(<App />)
    const word = misses(today())[0]
    for (const letter of word) fireEvent.click(key(letter.toUpperCase()))
    fireEvent.click(key('Backspace'))
    fireEvent.click(key(word.at(-1)!.toUpperCase()))
    fireEvent.click(key('Enter'))
    expect(letters(1)).toBe(word)
    expect(tiles(1).every((t) => /, (correct|in the word|not in the word)$/.test(t!))).toBe(true)
    expect(letters(2)).toBe('')
  })

  it('rejects short and unknown words', () => {
    render(<App />)
    guess('cra')
    expect(status()).toBe('Not enough letters')
    press('n')
    press('q')
    press('Enter')
    expect(status()).toBe('Not in word list')
    expect(letters(1)).toBe('cranq')
  })

  it('colours the tiles and keyboard after a guess', () => {
    render(<App />)
    const answer = today()
    const word = misses(answer)[0]
    guess(word)
    const marks = tiles(1)
    ;[...word].forEach((letter, i) => {
      const L = letter.toUpperCase()
      const expected = answer[i] === letter ? 'correct' : answer.includes(letter) ? null : 'not in the word'
      if (expected) expect(marks[i]).toBe(`${L}, ${expected}`)
      if (expected === 'not in the word') expect(key(`${L}, not in the word`)).toBeTruthy()
    })
  })

  it('wins the daily word, shows the stats and shares the result', async () => {
    render(<App />)
    const answer = today()
    guess(misses(answer)[0])
    guess(answer)
    expect(tiles(2)).toEqual([...answer].map((l) => `${l.toUpperCase()}, correct`))
    expect(status()).toBe('Magnificent')
    expect(screen.getByText('Solved in 2/6')).toBeTruthy()

    const stats = await screen.findByRole('dialog', { name: 'Daily statistics' }, { timeout: 2000 })
    expect(within(stats).getByLabelText('Played: 1')).toBeTruthy()
    expect(within(stats).getByLabelText('Win %: 100')).toBeTruthy()
    expect(within(stats).getByLabelText('Current streak: 1')).toBeTruthy()
    expect(within(stats).getByLabelText('2 guesses: 1 wins')).toBeTruthy()
    expect(within(stats).getByLabelText('Time until the next word').textContent).toMatch(/^\d\d:\d\d:\d\d$/)

    await act(async () => fireEvent.click(within(stats).getByRole('button', { name: 'Share' })))
    const text = writeText.mock.calls[0][0] as string
    expect(text.split('\n')[0]).toBe(`Word Guess #${dayIndex(new Date()) + 1} 2/6`)
    expect(text.split('\n')[3]).toBe('🟩🟩🟩🟩🟩')
    expect(text).not.toMatch(new RegExp(answer, 'i'))
    expect(status()).toBe('Copied results to clipboard')
  })

  it('shows the word after six misses', async () => {
    render(<App />)
    const answer = today()
    misses(answer).forEach(guess)
    expect(screen.getByText(/The word was/).textContent).toBe(`The word was ${answer}`)
    const stats = await screen.findByRole('dialog', { name: 'Daily statistics' }, { timeout: 2000 })
    expect(within(stats).getByLabelText('Win %: 0')).toBeTruthy()
    // The game is over: typing does nothing.
    fireEvent.click(within(stats).getByRole('button', { name: 'Close' }))
    press('a')
    expect(letters(1)).toBe(misses(answer)[0])
  })

  it('keeps the daily game across reloads', () => {
    render(<App />)
    const word = misses(today())[0]
    guess(word)
    type('ab')
    cleanup()
    render(<App />)
    expect(letters(1)).toBe(word)
    expect(letters(2)).toBe('')
  })

  it('plays practice words with their own stats', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    localStorage.clear()
    localStorage.setItem(STORAGE_KEY, '{}')
    render(<App />)
    fireEvent.click(button('Practice'))
    guess('trace')
    // The first practice word (Math.random = 0) is the first answer.
    guess(ANSWERS[0])
    expect(screen.getByText('Solved in 2/6')).toBeTruthy()
    const stats = await screen.findByRole('dialog', { name: 'Practice statistics' }, { timeout: 2000 })
    expect(within(stats).getByLabelText('Played: 1')).toBeTruthy()
    fireEvent.click(within(stats).getByRole('button', { name: 'New word' }))
    expect(letters(1)).toBe('')
    // Never the same word twice in a row: the next one along.
    guess(ANSWERS[1])
    expect(status()).toBe('Genius')

    fireEvent.click(screen.getByRole('button', { name: /^Daily/ }))
    expect(letters(1)).toBe('')
    fireEvent.click(button('Statistics'))
    expect(within(screen.getByRole('dialog', { name: 'Daily statistics' })).getByLabelText('Played: 0')).toBeTruthy()
  })

  it('turns on hard mode before the first guess and enforces it', () => {
    vi.spyOn(Math, 'random').mockReturnValue(ANSWERS.indexOf('crane') / ANSWERS.length)
    localStorage.clear()
    localStorage.setItem(STORAGE_KEY, '{}')
    render(<App />)
    fireEvent.click(button('Practice'))
    fireEvent.click(button('Settings'))
    fireEvent.click(screen.getByRole('switch', { name: 'Hard mode' }))
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    guess('trace')
    guess('grape')
    expect(status()).toBe('Guess must contain C')
    expect(letters(2)).toBe('grape')
  })

  it('switches to high contrast colours', () => {
    render(<App />)
    fireEvent.click(button('Settings'))
    const toggle = screen.getByRole('switch', { name: 'High contrast colours' })
    fireEvent.click(toggle)
    expect(document.documentElement.classList.contains('high-contrast')).toBe(true)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).settings.highContrast).toBe(true)
  })
})
