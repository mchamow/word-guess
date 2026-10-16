import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Mark } from './game'
import { Tile } from './Board'

function Example({ word, at, mark, children }: { word: string; at: number; mark: Mark; children: React.ReactNode }) {
  return (
    <figure className="space-y-2">
      <div className="flex gap-1">
        {[...word].map((letter, i) => (
          <Tile key={i} letter={letter} mark={i === at ? mark : undefined} still />
        ))}
      </div>
      <figcaption className="text-sm">{children}</figcaption>
    </figure>
  )
}

export function HelpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>How to play</DialogTitle>
          <DialogDescription>Guess the word in 6 tries.</DialogDescription>
        </DialogHeader>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>Each guess must be a valid five-letter word.</li>
          <li>The colour of the tiles shows how close your guess was.</li>
          <li>Type on your keyboard or tap the keys; Enter submits, Backspace deletes.</li>
        </ul>
        <p className="text-sm font-semibold">Examples</p>
        <Example word="crane" at={0} mark="correct">
          <strong>C</strong> is in the word and in the correct spot.
        </Example>
        <Example word="pilot" at={1} mark="present">
          <strong>I</strong> is in the word but in the wrong spot.
        </Example>
        <Example word="vague" at={3} mark="absent">
          <strong>U</strong> is not in the word in any spot.
        </Example>
        <p className="text-sm text-muted-foreground">
          A new <strong>daily</strong> word every day at midnight, the same for everyone. <strong>Practice</strong>{' '}
          gives you as many random words as you like. <strong>Hard mode</strong> (in settings) makes you use
          every hint you've been given.
        </p>
      </DialogContent>
    </Dialog>
  )
}
