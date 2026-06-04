import { useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { format } from 'date-fns'
import { useVirtualizer } from '@tanstack/react-virtual'
import { getAssetThumbnailUrl } from '../api/client'

export type TimelineAsset = {
  id: string
  fileCreatedAt: string
  isImage: boolean
  isFavorite: boolean
  duration: string | null
  thumbhash: string | null
}

type AssetGridProps = {
  assets: TimelineAsset[]
  selectedIds: Set<string>
  onSelectionChange: (ids: string[]) => void
  onOpenAsset: (index: number) => void
  emptyMessage?: string
}

type AssetRowItem = {
  asset: TimelineAsset
  index: number
}

type VirtualEntry =
  | {
      type: 'header'
      key: string
      label: string
      count: number
    }
  | {
      type: 'row'
      key: string
      items: AssetRowItem[]
    }

const chunk = (items: AssetRowItem[], chunkSize: number): AssetRowItem[][] => {
  const rows: AssetRowItem[][] = []

  for (let index = 0; index < items.length; index += chunkSize) {
    rows.push(items.slice(index, index + chunkSize))
  }

  return rows
}

export const AssetGrid = ({
  assets,
  selectedIds,
  onSelectionChange,
  onOpenAsset,
  emptyMessage = 'No assets found.',
}: AssetGridProps) => {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [selectionAnchorIndex, setSelectionAnchorIndex] = useState<number | null>(null)

  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    const node = containerRef.current

    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width)
    })

    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [])

  const columns = useMemo(() => {
    const minTileWidth = 170
    const gap = 12

    if (!containerWidth) {
      return 4
    }

    return Math.max(1, Math.floor((containerWidth + gap) / (minTileWidth + gap)))
  }, [containerWidth])

  const entries = useMemo(() => {
    const grouped = new Map<string, AssetRowItem[]>()

    assets.forEach((asset, index) => {
      const key = format(new Date(asset.fileCreatedAt), 'yyyy-MM')
      const existing = grouped.get(key)
      const item = { asset, index }

      if (!existing) {
        grouped.set(key, [item])
        return
      }

      existing.push(item)
    })

    const nextEntries: VirtualEntry[] = []

    for (const [monthKey, items] of grouped.entries()) {
      const monthLabel = format(new Date(`${monthKey}-01T00:00:00Z`), 'MMMM yyyy')

      nextEntries.push({
        type: 'header',
        key: `header-${monthKey}`,
        label: monthLabel,
        count: items.length,
      })

      const rows = chunk(items, columns)
      rows.forEach((rowItems, rowIndex) => {
        nextEntries.push({
          type: 'row',
          key: `row-${monthKey}-${rowIndex}`,
          items: rowItems,
        })
      })
    }

    return nextEntries
  }, [assets, columns])

  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => viewportRef.current,
    estimateSize: (index) => (entries[index]?.type === 'header' ? 46 : 214),
    overscan: 8,
  })

  const toggleSelect = (id: string): string[] => {
    const next = new Set(selectedIds)

    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }

    return Array.from(next)
  }

  const applySelection = (index: number, event: MouseEvent, id: string) => {
    const withRange = event.shiftKey && selectionAnchorIndex !== null
    const withToggle = event.metaKey || event.ctrlKey

    if (withRange) {
      const start = Math.min(selectionAnchorIndex, index)
      const end = Math.max(selectionAnchorIndex, index)
      const rangeIds = assets.slice(start, end + 1).map((asset) => asset.id)

      if (withToggle) {
        const next = new Set(selectedIds)
        rangeIds.forEach((rangeId) => next.add(rangeId))
        onSelectionChange(Array.from(next))
      } else {
        onSelectionChange(rangeIds)
      }

      setSelectionAnchorIndex(index)
      return
    }

    if (withToggle) {
      onSelectionChange(toggleSelect(id))
      setSelectionAnchorIndex(index)
      return
    }

    onSelectionChange([id])
    setSelectionAnchorIndex(index)
  }

  if (!assets.length) {
    return (
      <section className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
        {emptyMessage}
      </section>
    )
  }

  return (
    <section className="mt-6" ref={containerRef}>
      <div
        ref={viewportRef}
        className="h-[calc(100vh-210px)] overflow-auto rounded-xl border border-slate-200 bg-white"
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const entry = entries[virtualItem.index]

            if (!entry) {
              return null
            }

            if (entry.type === 'header') {
              return (
                <div
                  key={entry.key}
                  className="sticky z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur"
                  style={{
                    position: 'absolute',
                    width: '100%',
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <h3 className="text-sm font-semibold text-slate-800">{entry.label}</h3>
                  <p className="text-xs text-slate-500">{entry.count} items</p>
                </div>
              )
            }

            return (
              <div
                key={entry.key}
                className="px-4 py-3"
                style={{
                  position: 'absolute',
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <div
                  className="grid gap-3"
                  style={{
                    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                  }}
                >
                  {entry.items.map(({ asset, index }) => {
                    const selected = selectedIds.has(asset.id)

                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={(event) => applySelection(index, event, asset.id)}
                        onDoubleClick={() => onOpenAsset(index)}
                        className={`group relative overflow-hidden rounded-lg border text-left transition ${
                          selected
                            ? 'border-cyan-600 ring-2 ring-cyan-500/50'
                            : 'border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        <img
                          src={getAssetThumbnailUrl(asset.id, 'preview')}
                          alt=""
                          loading="lazy"
                          draggable={false}
                          className="h-36 w-full bg-slate-100 object-cover"
                        />

                        <div className="flex items-center justify-between px-2 py-2 text-xs text-slate-600">
                          <span>{format(new Date(asset.fileCreatedAt), 'MMM d, yyyy')}</span>
                          <span>{asset.isImage ? 'Photo' : 'Video'}</span>
                        </div>

                        <span className="absolute bottom-2 right-2 rounded bg-slate-900/75 px-1.5 py-0.5 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                          Double-click to open
                        </span>

                        {asset.isFavorite ? (
                          <span className="absolute right-2 top-2 rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">
                            Fav
                          </span>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
