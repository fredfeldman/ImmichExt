import { useState } from 'react'

type TagOption = {
  id: string
  name: string
  value: string
}

type BulkTagPickerProps = {
  open: boolean
  tagOptions: TagOption[]
  selectedCount: number
  onClose: () => void
  onSubmit: (tagIds: string[]) => Promise<void>
  onCreate: (tagName: string) => Promise<void>
}

export const BulkTagPicker = ({
  open,
  tagOptions,
  selectedCount,
  onClose,
  onSubmit,
  onCreate,
}: BulkTagPickerProps) => {
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [newTagName, setNewTagName] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  if (!open) {
    return null
  }

  const toggleTag = (id: string) => {
    setSelectedTagIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    )
  }

  const handleSubmit = async () => {
    if (!selectedTagIds.length) {
      return
    }

    setIsBusy(true)
    try {
      await onSubmit(selectedTagIds)
      onClose()
    } finally {
      setIsBusy(false)
    }
  }

  const handleCreate = async () => {
    const value = newTagName.trim()
    if (!value) {
      return
    }

    setIsBusy(true)
    try {
      await onCreate(value)
      setNewTagName('')
      onClose()
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <section className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Tag Assets</h2>
            <p className="text-sm text-slate-600">Apply tags to {selectedCount} selected assets.</p>
          </div>
          <button type="button" onClick={onClose} className="text-sm text-slate-500">Close</button>
        </div>

        <div className="mt-4 max-h-72 overflow-auto rounded-lg border border-slate-200 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {tagOptions.map((tag) => (
              <label key={tag.id} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedTagIds.includes(tag.id)}
                  onChange={() => toggleTag(tag.id)}
                />
                <span className="truncate text-slate-800">{tag.value || tag.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selectedTagIds.length || isBusy}
            className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isBusy ? 'Applying...' : 'Apply Selected Tags'}
          </button>
        </div>

        <div className="mt-5 border-t border-slate-200 pt-4">
          <label className="block text-sm font-medium text-slate-700">Create new tag</label>
          <div className="mt-2 flex gap-2">
            <input
              value={newTagName}
              onChange={(event) => setNewTagName(event.target.value)}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="kids / vacation"
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={!newTagName.trim() || isBusy}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
            >
              Create
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
