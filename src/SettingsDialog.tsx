import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { Settings } from './state'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: Settings
  onHardMode: (on: boolean) => void
  onHighContrast: (on: boolean) => void
}

function Setting(props: { id: string; title: string; hint: string; checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-3 last:border-b-0">
      <div className="space-y-0.5">
        <Label htmlFor={props.id}>{props.title}</Label>
        <p id={`${props.id}-hint`} className="text-sm text-muted-foreground">
          {props.hint}
        </p>
      </div>
      <Switch
        id={props.id}
        aria-describedby={`${props.id}-hint`}
        checked={props.checked}
        onCheckedChange={props.onChange}
      />
    </div>
  )
}

export function SettingsDialog({ open, onOpenChange, settings, onHardMode, onHighContrast }: SettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Saved in this browser. The theme follows your system.</DialogDescription>
        </DialogHeader>
        <div>
          <Setting
            id="hard-mode"
            title="Hard mode"
            hint="Any revealed hints must be used in later guesses. Turn it on before your first guess."
            checked={settings.hardMode}
            onChange={onHardMode}
          />
          <Setting
            id="high-contrast"
            title="High contrast colours"
            hint="Orange and blue instead of green and yellow."
            checked={settings.highContrast}
            onChange={onHighContrast}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
