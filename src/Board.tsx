import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import { FLIP_STAGGER_MS, MARK_LABEL, MAX_GUESSES, REVEAL_MS, scoreGuess, WORD_LENGTH, type Mark } from './game'

const MARK_BG: Record<Mark, string> = {
  correct: 'var(--correct)',
  present: 'var(--present)',
  absent: 'var(--absent)',
}

interface TileProps {
  letter?: string
  mark?: Mark
  /** Position in the row, for staggering the flip. */
  index?: number
  /** Hop after flipping (the winning row). */
  bounce?: boolean
  /** A still example tile (the help dialog). */
  still?: boolean
}

export function Tile({ letter, mark, index = 0, bounce = false, still = false }: TileProps) {
  const label = letter ? `${letter.toUpperCase()}${mark ? `, ${MARK_LABEL[mark]}` : ''}` : 'empty'
  const animation =
    mark && !still
      ? [
          `flip 500ms ease-in-out ${index * FLIP_STAGGER_MS}ms both`,
          bounce && `bounce-once 600ms ease-out ${REVEAL_MS + index * 100}ms`,
        ]
          .filter(Boolean)
          .join(', ')
      : undefined
  return (
    <div
      role="img"
      aria-label={label}
      data-mark={mark}
      style={mark ? ({ '--tile-bg': MARK_BG[mark], animation } as CSSProperties) : undefined}
      className={cn(
        'flex aspect-square items-center justify-center border-2 font-bold uppercase select-none',
        still ? 'size-10 text-xl' : 'w-full text-[clamp(1.5rem,7vw,2rem)]',
        !letter && 'border-tile-empty',
        letter && !mark && 'border-tile-typed motion-safe:animate-pop',
        mark && 'border-(--tile-bg) bg-(--tile-bg) text-white motion-reduce:animate-none!',
      )}
    >
      {letter}
    </div>
  )
}

interface BoardProps {
  guesses: string[]
  answer: string
  current: string
  /** Changes on every rejected guess, to shake the current row again. */
  shake: number
  won: boolean
}

export function Board({ guesses, answer, current, shake, won }: BoardProps) {
  return (
    <div role="group" aria-label="Board" className="grid w-full max-w-[350px] gap-1.5 [perspective:800px]">
      {Array.from({ length: MAX_GUESSES }, (_, row) => {
        const guess = guesses[row]
        const isCurrent = row === guesses.length
        const letters = guess ?? (isCurrent ? current : '')
        const marks = guess ? scoreGuess(guess, answer) : null
        const bounce = won && row === guesses.length - 1
        return (
          <div
            // A new key remounts the row, which replays the shake.
            key={isCurrent ? `current-${shake}` : row}
            role="group"
            aria-label={`Guess ${row + 1}`}
            className={cn(
              'grid grid-cols-5 gap-1.5',
              isCurrent && shake > 0 && 'motion-safe:animate-shake',
            )}
          >
            {Array.from({ length: WORD_LENGTH }, (_, i) => (
              <Tile key={i} letter={letters[i]} mark={marks?.[i]} index={i} bounce={bounce} />
            ))}
          </div>
        )
      })}
    </div>
  )
}
