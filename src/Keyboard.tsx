import { Delete } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { MARK_LABEL, type Mark } from './game'

const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']

const MARK_CLASS: Record<Mark, string> = {
  correct: 'bg-correct text-white',
  present: 'bg-present text-white',
  absent: 'bg-absent text-white',
}

interface KeyboardProps {
  marks: Map<string, Mark>
  onLetter: (letter: string) => void
  onEnter: () => void
  onDelete: () => void
}

export function Keyboard({ marks, onLetter, onEnter, onDelete }: KeyboardProps) {
  return (
    <div role="group" aria-label="Keyboard" className="flex w-full max-w-[500px] flex-col gap-2">
      {ROWS.map((row, r) => (
        <div key={row} className="flex gap-1.5">
          {r === 1 && <div className="flex-[0.5]" />}
          {r === 2 && (
            <Key label="Enter" wide onPress={onEnter}>
              Enter
            </Key>
          )}
          {[...row].map((letter) => {
            const mark = marks.get(letter)
            return (
              <Key
                key={letter}
                label={`${letter.toUpperCase()}${mark ? `, ${MARK_LABEL[mark]}` : ''}`}
                className={mark ? MARK_CLASS[mark] : undefined}
                mark={mark}
                onPress={() => onLetter(letter)}
              >
                {letter}
              </Key>
            )
          })}
          {r === 2 && (
            <Key label="Backspace" wide onPress={onDelete}>
              <Delete className="size-5" aria-hidden />
            </Key>
          )}
          {r === 1 && <div className="flex-[0.5]" />}
        </div>
      ))}
    </div>
  )
}

interface KeyProps {
  label: string
  children: ReactNode
  onPress: () => void
  wide?: boolean
  mark?: Mark
  className?: string
}

function Key({ label, children, onPress, wide, mark, className }: KeyProps) {
  return (
    <button
      type="button"
      aria-label={label}
      data-mark={mark}
      // Keep focus where it was: a focused key would also fire on the next physical Enter.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPress}
      className={cn(
        'flex h-14 min-w-0 items-center justify-center rounded-md bg-key font-semibold uppercase select-none',
        'transition-[background-color,transform] active:scale-95 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
        wide ? 'flex-[1.5] text-xs' : 'flex-1 text-sm sm:text-base',
        className,
      )}
    >
      {children}
    </button>
  )
}
