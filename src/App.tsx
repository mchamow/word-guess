import { useEffect, useReducer, useState } from 'react'
import { ChartColumn, CircleHelp, RotateCcw, Settings as SettingsIcon, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { Board } from './Board'
import { dayIndex, letterMarks, msUntilTomorrow, randomAnswer, REVEAL_MS, shareText } from './game'
import { HelpDialog } from './HelpDialog'
import { Keyboard } from './Keyboard'
import { SettingsDialog } from './SettingsDialog'
import { gameStatus, liveStreak, reducer, type Mode } from './state'
import { StatsDialog } from './StatsDialog'
import { load, save, STORAGE_KEY } from './storage'

type Panel = 'help' | 'stats' | 'settings' | null

const MESSAGE_MS = 1800

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

function isFirstVisit(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === null
  } catch {
    return false
  }
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button variant="ghost" size="icon" aria-label={label} onClick={onClick} />}>
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export default function App() {
  const [today, setToday] = useState(() => dayIndex(new Date()))
  const [state, dispatch] = useReducer(reducer, today, (day) => load(day))
  const [panel, setPanel] = useState<Panel>(() => (isFirstVisit() ? 'help' : null))

  const { mode, settings, current, message, shake, finished } = state
  const game = state.games[mode]
  const status = gameStatus(game)
  const puzzle = game.day === null ? null : game.day + 1

  useEffect(() => save(state), [state])

  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', settings.highContrast)
  }, [settings.highContrast])

  // A new daily word at local midnight, or on coming back to a tab left open overnight.
  useEffect(() => {
    const check = () => {
      const day = dayIndex(new Date())
      setToday(day)
      dispatch({ type: 'newDay', day })
    }
    const timer = setTimeout(check, msUntilTomorrow(new Date()) + 100)
    document.addEventListener('visibilitychange', check)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', check)
    }
  }, [today])

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => dispatch({ type: 'dismissMessage', id: message.id }), MESSAGE_MS)
    return () => clearTimeout(timer)
  }, [message])

  // Show the stats once the last row has flipped (and the winning row hopped).
  useEffect(() => {
    if (!finished) return
    const timer = setTimeout(() => setPanel('stats'), reducedMotion() ? 600 : REVEAL_MS + 1200)
    return () => clearTimeout(timer)
  }, [finished])

  useEffect(() => {
    if (panel) return
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, [role="dialog"]')) return
      if (e.key === 'Enter') {
        // Submit the guess rather than also clicking whatever button has focus.
        e.preventDefault()
        dispatch({ type: 'submit' })
      } else if (e.key === 'Backspace') {
        dispatch({ type: 'delete' })
      } else if (/^[a-z]$/i.test(e.key)) {
        dispatch({ type: 'type', letter: e.key })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [panel])

  const share = async () => {
    const text = shareText({
      guesses: game.guesses,
      answer: game.answer,
      won: status === 'won',
      hardMode: game.hardMode,
      highContrast: settings.highContrast,
      puzzle,
    })
    try {
      await navigator.clipboard.writeText(text)
      dispatch({ type: 'notify', text: 'Copied results to clipboard' })
    } catch {
      dispatch({ type: 'notify', text: "Couldn't copy to the clipboard" })
    }
  }

  const newWord = () => {
    dispatch({ type: 'newPractice', answer: randomAnswer(Math.random, state.games.practice.answer) })
    setPanel(null)
  }

  return (
    <TooltipProvider>
      <div className="flex min-h-dvh flex-col">
        <header className="flex items-center justify-between border-b px-2 py-1.5 sm:px-4">
          <div className="flex w-24">
            <IconButton label="How to play" onClick={() => setPanel('help')}>
              <CircleHelp />
            </IconButton>
          </div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Word Guess</h1>
          <div className="flex w-24 justify-end">
            <IconButton label="Statistics" onClick={() => setPanel('stats')}>
              <ChartColumn />
            </IconButton>
            <IconButton label="Settings" onClick={() => setPanel('settings')}>
              <SettingsIcon />
            </IconButton>
          </div>
        </header>

        <main className="flex flex-1 flex-col items-center gap-3 px-2 pt-3 pb-2 sm:gap-4 sm:pt-4">
          <div className="flex h-9 items-center gap-2">
            <ToggleGroup
              variant="outline"
              aria-label="Mode"
              value={[mode]}
              onValueChange={([next]) => next && dispatch({ type: 'setMode', mode: next as Mode })}
            >
              <ToggleGroupItem value="daily" className="px-3">
                Daily <span className="text-muted-foreground tabular-nums">#{state.games.daily.day! + 1}</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="practice" className="px-3">
                Practice
              </ToggleGroupItem>
            </ToggleGroup>
            {mode === 'practice' && (
              <IconButton label="New word" onClick={newWord}>
                <RotateCcw />
              </IconButton>
            )}
          </div>

          <div className="relative flex w-full flex-1 items-center justify-center">
            <div
              role="status"
              aria-live="polite"
              className={cn(
                'pointer-events-none absolute top-[15%] z-10 rounded-md bg-foreground px-4 py-2.5 text-sm font-semibold text-background shadow-lg transition-opacity',
                message ? 'opacity-100' : 'opacity-0',
              )}
            >
              {message?.text}
            </div>
            <div className="flex w-[min(350px,100%,calc((100dvh-22.5rem)*0.83))] justify-center">
              <Board
                guesses={game.guesses}
                answer={game.answer}
                current={current}
                shake={shake}
                won={status === 'won'}
              />
            </div>
          </div>

          <div className="flex h-9 items-center gap-3 text-sm" aria-live="polite">
            {status === 'lost' && (
              <p>
                The word was <strong className="tracking-wide uppercase">{game.answer}</strong>
              </p>
            )}
            {status === 'won' && <p>Solved in {game.guesses.length}/6</p>}
            {status !== 'playing' && (
              <>
                <Button size="sm" variant="outline" onClick={share}>
                  <Share2 aria-hidden /> Share
                </Button>
                {mode === 'practice' && (
                  <Button size="sm" onClick={newWord}>
                    <RotateCcw aria-hidden /> New word
                  </Button>
                )}
              </>
            )}
          </div>

          <Keyboard
            marks={letterMarks(game.guesses, game.answer)}
            onLetter={(letter) => dispatch({ type: 'type', letter })}
            onEnter={() => dispatch({ type: 'submit' })}
            onDelete={() => dispatch({ type: 'delete' })}
          />
        </main>
      </div>

      <HelpDialog open={panel === 'help'} onOpenChange={(open) => setPanel(open ? 'help' : null)} />
      <StatsDialog
        open={panel === 'stats'}
        onOpenChange={(open) => setPanel(open ? 'stats' : null)}
        mode={mode}
        stats={state.stats[mode]}
        streak={liveStreak(state.stats[mode], mode, today)}
        status={status}
        guessCount={game.guesses.length}
        onShare={share}
        onNewWord={newWord}
      />
      <SettingsDialog
        open={panel === 'settings'}
        onOpenChange={(open) => setPanel(open ? 'settings' : null)}
        settings={settings}
        onHardMode={(on) => dispatch({ type: 'setHardMode', on })}
        onHighContrast={(on) => dispatch({ type: 'setHighContrast', on })}
      />
    </TooltipProvider>
  )
}
