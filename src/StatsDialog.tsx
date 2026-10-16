import { RotateCcw, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useCountdown } from './countdown'
import type { Mode, Stats, Status } from './state'

interface StatsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: Mode
  stats: Stats
  streak: number
  status: Status
  /** Guesses used in the current game, to highlight its bar once it's won. */
  guessCount: number
  onShare: () => void
  onNewWord: () => void
}

export function StatsDialog(props: StatsDialogProps) {
  const { open, onOpenChange, mode, stats, streak, status, guessCount, onShare, onNewWord } = props
  const countdown = useCountdown(open && mode === 'daily' && status !== 'playing')
  const winRate = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0
  const most = Math.max(1, ...stats.distribution)
  const figures: [string, number][] = [
    ['Played', stats.played],
    ['Win %', winRate],
    ['Current streak', streak],
    ['Max streak', stats.maxStreak],
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'daily' ? 'Daily statistics' : 'Practice statistics'}</DialogTitle>
          <DialogDescription>
            {mode === 'daily' ? 'One word a day; the streak counts days in a row.' : 'Random words; the streak counts wins in a row.'}
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-4 gap-2 text-center">
          {figures.map(([label, value]) => (
            <div key={label} className="flex flex-col-reverse">
              <dt className="text-xs leading-tight text-muted-foreground">{label}</dt>
              <dd className="text-3xl font-semibold tabular-nums" aria-label={`${label}: ${value}`}>
                {value}
              </dd>
            </div>
          ))}
        </dl>

        <section aria-labelledby="distribution" className="space-y-1.5">
          <h3 id="distribution" className="text-sm font-semibold">
            Guess distribution
          </h3>
          {stats.wins === 0 ? (
            <p className="text-sm text-muted-foreground">No wins yet.</p>
          ) : (
            <ol className="space-y-1">
              {stats.distribution.map((n, i) => {
                const current = status === 'won' && guessCount === i + 1
                return (
                  <li key={i} className="flex items-center gap-2 text-sm" aria-label={`${i + 1} guesses: ${n} wins`}>
                    <span className="w-3 tabular-nums">{i + 1}</span>
                    <span
                      className={cn(
                        'flex h-5 min-w-6 justify-end rounded-sm px-1.5 text-xs leading-5 font-semibold tabular-nums',
                        current ? 'bg-correct text-white' : 'bg-absent text-white',
                      )}
                      style={{ width: `${(n / most) * 100}%` }}
                      data-current={current || undefined}
                    >
                      {n}
                    </span>
                  </li>
                )
              })}
            </ol>
          )}
        </section>

        {status !== 'playing' && (
          <div className="flex items-center justify-between gap-3 border-t pt-4">
            {mode === 'daily' ? (
              <p className="text-sm">
                <span className="block text-muted-foreground">Next word in</span>
                <span className="text-2xl font-semibold tabular-nums" aria-label="Time until the next word">
                  {countdown}
                </span>
              </p>
            ) : (
              <Button variant="outline" size="lg" onClick={onNewWord}>
                <RotateCcw aria-hidden /> New word
              </Button>
            )}
            <Button size="lg" onClick={onShare}>
              <Share2 aria-hidden /> Share
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
