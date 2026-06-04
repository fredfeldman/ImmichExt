import { useEffect, useMemo, useState } from 'react'
import { AssetTypeEnum, MemoryType, searchMemories } from '@immich/sdk'
import { useQuery } from '@tanstack/react-query'
import { AppHeader } from '../components/AppHeader'
import { AssetGrid } from '../components/AssetGrid'
import { AssetViewer } from '../components/AssetViewer'
import type { TimelineAsset } from '../components/AssetGrid'
import { useSelectionStore } from '../store/selection'

export const MemoriesPage = () => {
  const selectedIds = useSelectionStore((state) => state.selectedIds)
  const setAllSelected = useSelectionStore((state) => state.setAll)

  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)

  const memoriesQuery = useQuery({
    queryKey: ['memories', 'on-this-day'],
    queryFn: () =>
      searchMemories({
        $type: MemoryType.OnThisDay,
        size: 50,
        isTrashed: false,
      }),
    staleTime: 60_000,
  })

  const memories = memoriesQuery.data ?? []

  useEffect(() => {
    if (!memories.length) {
      setSelectedMemoryId(null)
      return
    }

    if (!selectedMemoryId || !memories.some((memory) => memory.id === selectedMemoryId)) {
      setSelectedMemoryId(memories[0].id)
    }
  }, [memories, selectedMemoryId])

  const selectedMemory = useMemo(
    () => memories.find((memory) => memory.id === selectedMemoryId) ?? null,
    [memories, selectedMemoryId],
  )

  const memoryAssets = useMemo<TimelineAsset[]>(() => {
    if (!selectedMemory) {
      return []
    }

    return selectedMemory.assets
      .map((asset) => ({
        id: asset.id,
        fileCreatedAt: asset.fileCreatedAt,
        isImage: asset.type === AssetTypeEnum.Image,
        isFavorite: asset.isFavorite,
        duration: asset.duration,
        thumbhash: asset.thumbhash,
      }))
      .sort(
        (left, right) =>
          new Date(right.fileCreatedAt).getTime() - new Date(left.fileCreatedAt).getTime(),
      )
  }, [selectedMemory])

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col p-4 sm:p-6">
      <AppHeader
        title="Memories"
        subtitle="On-this-day memories from your library with quick browsing."
      />

      <section className="mt-6 grid gap-6 lg:grid-cols-[320px,1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-base font-semibold text-slate-900">Available Memories</h2>

          {memoriesQuery.isLoading ? (
            <p className="mt-3 text-sm text-slate-600">Loading memories...</p>
          ) : null}

          {memoriesQuery.isError ? (
            <p className="mt-3 rounded border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">
              Failed to load memories.
            </p>
          ) : null}

          <div className="mt-3 max-h-[calc(100vh-280px)] space-y-2 overflow-auto pr-1">
            {memories.map((memory) => {
              const active = memory.id === selectedMemoryId

              return (
                <button
                  key={memory.id}
                  type="button"
                  onClick={() => setSelectedMemoryId(memory.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left ${
                    active ? 'border-cyan-300 bg-cyan-50' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {new Date(memory.memoryAt).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-slate-600">
                    {memory.assets.length} assets · {memory.type}
                  </p>
                </button>
              )
            })}
          </div>
        </aside>

        <section>
          {selectedMemory ? (
            <AssetGrid
              assets={memoryAssets}
              selectedIds={selectedIds}
              onSelectionChange={setAllSelected}
              onOpenAsset={setViewerIndex}
              emptyMessage="No assets in this memory."
            />
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
              No memories available.
            </div>
          )}
        </section>
      </section>

      {viewerIndex !== null ? (
        <AssetViewer assets={memoryAssets} initialIndex={viewerIndex} onClose={() => setViewerIndex(null)} />
      ) : null}
    </main>
  )
}
