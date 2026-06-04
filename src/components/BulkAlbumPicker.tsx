import { useState } from 'react'

type AlbumOption = {
  id: string
  name: string
  count: number
}

type BulkAlbumPickerProps = {
  open: boolean
  albumOptions: AlbumOption[]
  selectedCount: number
  onClose: () => void
  onSubmit: (albumId: string) => Promise<void>
  onCreate: (albumName: string) => Promise<void>
}

export const BulkAlbumPicker = ({
  open,
  albumOptions,
  selectedCount,
  onClose,
  onSubmit,
  onCreate,
}: BulkAlbumPickerProps) => {
  const [albumId, setAlbumId] = useState('')
  const [newAlbumName, setNewAlbumName] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  if (!open) {
    return null
  }

  const handleSubmit = async () => {
    if (!albumId) {
      return
    }

    setIsBusy(true)
    try {
      await onSubmit(albumId)
      onClose()
    } finally {
      setIsBusy(false)
    }
  }

  const handleCreate = async () => {
    const value = newAlbumName.trim()
    if (!value) {
      return
    }

    setIsBusy(true)
    try {
      await onCreate(value)
      setNewAlbumName('')
      onClose()
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <section className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Add to Album</h2>
            <p className="text-sm text-slate-600">Add {selectedCount} selected assets to an album.</p>
          </div>
          <button type="button" onClick={onClose} className="text-sm text-slate-500">Close</button>
        </div>

        <div className="mt-4 space-y-2">
          <label className="block text-sm font-medium text-slate-700">Existing albums</label>
          <select
            value={albumId}
            onChange={(event) => setAlbumId(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Select an album</option>
            {albumOptions.map((album) => (
              <option key={album.id} value={album.id}>
                {album.name} ({album.count})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!albumId || isBusy}
            className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isBusy ? 'Adding...' : 'Add to Selected Album'}
          </button>
        </div>

        <div className="mt-5 border-t border-slate-200 pt-4">
          <label className="block text-sm font-medium text-slate-700">Create new album</label>
          <div className="mt-2 flex gap-2">
            <input
              value={newAlbumName}
              onChange={(event) => setNewAlbumName(event.target.value)}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Family Favorites"
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={!newAlbumName.trim() || isBusy}
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
