type ShortcutItem = {
  keys: string
  action: string
}

type ShortcutsOverlayProps = {
  open: boolean
  onClose: () => void
  shortcuts: ShortcutItem[]
}

export const ShortcutsOverlay = ({ open, onClose, shortcuts }: ShortcutsOverlayProps) => {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Keyboard Shortcuts</h2>
            <p className="text-sm text-slate-600">Quick reference for timeline and viewer actions.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
          >
            Close
          </button>
        </header>

        <div className="max-h-[70vh] overflow-auto px-5 py-4">
          <ul className="space-y-2">
            {shortcuts.map((shortcut) => (
              <li key={`${shortcut.keys}-${shortcut.action}`} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <span className="text-sm text-slate-700">{shortcut.action}</span>
                <kbd className="rounded border border-slate-300 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">
                  {shortcut.keys}
                </kbd>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
