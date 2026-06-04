type BulkToolbarProps = {
  selectedCount: number
  busyAction: string | null
  onAddToAlbum: () => void
  onTag: () => void
  onFavorite: () => void
  onArchive: () => void
  onDownload: () => void
  onShare: () => void
  onTrash: () => void
  onClear: () => void
}

export const BulkToolbar = ({
  selectedCount,
  busyAction,
  onAddToAlbum,
  onTag,
  onFavorite,
  onArchive,
  onDownload,
  onShare,
  onTrash,
  onClear,
}: BulkToolbarProps) => {
  if (selectedCount < 1) {
    return null
  }

  const disabled = Boolean(busyAction)

  return (
    <div className="sticky top-4 z-30 mt-4 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-3 text-sm font-semibold text-slate-900">{selectedCount} selected</div>
        <button type="button" onClick={onAddToAlbum} disabled={disabled} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:opacity-60">Album</button>
        <button type="button" onClick={onTag} disabled={disabled} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:opacity-60">Tag</button>
        <button type="button" onClick={onFavorite} disabled={disabled} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:opacity-60">Favorite</button>
        <button type="button" onClick={onArchive} disabled={disabled} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:opacity-60">Archive</button>
        <button type="button" onClick={onDownload} disabled={disabled} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:opacity-60">Download ZIP</button>
        <button type="button" onClick={onShare} disabled={disabled} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:opacity-60">Share Link</button>
        <button type="button" onClick={onTrash} disabled={disabled} className="rounded-lg border border-rose-200 px-3 py-2 text-sm text-rose-700 disabled:opacity-60">Trash</button>
        <button type="button" onClick={onClear} disabled={disabled} className="ml-auto rounded-lg px-3 py-2 text-sm text-slate-500 disabled:opacity-60">Clear</button>
      </div>
      {busyAction ? <p className="mt-2 text-xs text-slate-500">Running: {busyAction}</p> : null}
    </div>
  )
}
