# 🟩 Word Guess

[![Test and deploy](https://github.com/mchamow/word-guess/actions/workflows/deploy.yml/badge.svg)](https://github.com/mchamow/word-guess/actions/workflows/deploy.yml)

**Day 26 of [100 Days of React](https://github.com/mchamow?tab=repositories)**: Guess the five-letter word in six tries.

**Live demo:** https://mchamow.github.io/word-guess/

## Features

- **Six tries at a five-letter word**: tiles flip to green (right spot), yellow (in the word) or grey (not in it), and the winning row hops
- **Duplicate letters handled properly**: a letter is only marked as many times as the answer has it, and greens claim their copy first
- **Physical and on-screen keyboard**: type, <kbd>Backspace</kbd>, <kbd>Enter</kbd>, or tap the keys. The keys take on the best colour each letter has earned
- **Daily word**: one numbered puzzle a day that changes at local midnight, with a countdown to the next one. Unfinished games pick up where you left off
- **Practice mode**: unlimited random words, played alongside the daily game
- **Hard mode**: revealed hints must be used ("3rd letter must be A", "Guess must contain 2 Es"). Turn it on before the first guess of a round
- **Statistics** per mode: games played, win %, current and max streak (consecutive days for the daily word), and the guess distribution with your latest win highlighted
- **Share** a spoiler-free result (`Word Guess #289 3/6` plus coloured squares) to the clipboard
- **High-contrast colours** (orange and blue), saved with your games and stats in `localStorage`
- Over 14,000 accepted guesses and about 700 everyday answers. Rejected guesses shake the row and explain why
- Light and dark themes that follow the system, a phone layout, and reduced motion respected

## How it works

- [`src/game.ts`](src/game.ts): scoring, keyboard colours, hard-mode rules, the daily word (answers shuffled once with a fixed seed and dealt one per day) and share text
- [`src/state.ts`](src/state.ts): a reducer holding a game per mode, stats and settings; streaks and results are recorded there
- [`src/storage.ts`](src/storage.ts): guarded `localStorage` load that rebuilds each part from defaults if it's missing or malformed, and swaps in a new daily game each day
- [`src/words.ts`](src/words.ts): accepted guesses, from Webster's Second International (public domain) plus plurals and -ed forms

## Tech

React 19 · TypeScript · Vite · Tailwind CSS v4 + [shadcn/ui](https://ui.shadcn.com) (Base UI) · lucide icons · Vitest + Testing Library · deployed to GitHub Pages with GitHub Actions.

## Run locally

```bash
pnpm install
pnpm dev
pnpm test   # 51 unit and component tests (Vitest)
```
