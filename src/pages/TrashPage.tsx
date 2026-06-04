import { useMemo, useState } from 'react'
import { AssetOrder, emptyTrash, getTimeBucket, getTimeBuckets, restoreAssets } from '@immich/sdk'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppHeader } from '../components/AppHeader'
import { AssetGrid } from '../components/AssetGrid'
import { AssetViewer } from '../components/AssetViewer'
import type { TimelineAsset } from '../components/AssetGrid'
import { useSelectionStore } from '../store/selection'

export const TrashPage = () => {
  const queryClient = useQueryClient()
  const selectedIds = useSelectionStore((state) => state.selectedIds)
  const setAllSelected = useSelectionStore((state) => state.setAll)
  const clearSelected = useSelectionStore((state) => state.clear)

  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const trashedBucketsQuery = useQuery({
    queryKey: ['trash', 'buckets'],
    queryFn: () => getTimeBuckets({ order: AssetOrder.Desc, isTrashed: true }),
    staleTime: 60_000,
  })

  const visibleBuckets = useMemo(
    () => (trashedBucketsQuery.data ?? []).slice(0, 24),
    [trashedBucketsQuery.data],
  )

  const bucketQueries = useQueries({
    queries: visibleBuckets.map((bucket) => ({
      queryKey: ['trash', 'bucket', bucket.timeBucket],
      queryFn: () =>
        getTimeBucket({
          timeBucket: bucket.timeBucket,
          order: AssetOrder.Desc,
          isTrashed: true,
        }),
      staleTime: 60_000,
    })),
  })

  const trashedAssets = useMemo<TimelineAsset[]>(() => {
    const assets: TimelineAsset[] = []

    for (const bucketQuery of bucketQueries) {
      if (!bucketQuery.data) {
        continue
      }

      const bucket = bucketQuery.data
      for (let index = 0; index < bucket.id.length; index += 1) {
        assets.push({
          id: bucket.id[index],
          fileCreatedAt: bucket.fileCreatedAt[index],
          isImage: bucket.isImage[index],
          isFavorite: bucket.isFavorite[index],
          duration: bucket.duration[index],
          thumbhash: bucket.thumbhash[index],
        })
      }
    }

    assets.sort(
      (left, right) =>
        new Date(right.fileCreatedAt).getTime() - new Date(left.fileCreatedAt).getTime(),
    )

    return assets
  }, [bucketQueries])

  const restoreMutation = useMutation({
    mutationFn: ({ bulkIdsDto }: Parameters<typeof restoreAssets>[0]) => restoreAssets({ bulkIdsDto }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['trash'] })
      await queryClient.invalidateQueries({ queryKey: ['timeline'] })
      clearSelected()
    },
  })

  const emptyTrashMutation = useMutation({
    mutationFn: () => emptyTrash(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['trash'] })
      await queryClient.invalidateQueries({ queryKey: ['timeline'] })
      clearSelected()
    },
  })

  const selectedIdList = useMemo(() => Array.from(selectedIds), [selectedIds])

  const handleRestoreSelected = async () => {
    if (!selectedIdList.length) {
      setStatusMessage('Select one or more assets to restore.')
      return
    }

    setStatusMessage(null)

    try {
      await restoreMutation.mutateAsync({ bulkIdsDto: { ids: selectedIdList } })
      setStatusMessage(`Restored ${selectedIdList.length} assets.`)
    } catch {
      setStatusMessage('Failed to restore selected assets.')
    }
  }

  const handleEmptyTrash = async () => {
    const confirmed = window.confirm('Permanently delete all items currently in trash?')
    if (!confirmed) {
      return
    }

    setStatusMessage(null)

    try {
      const result = await emptyTrashMutation.mutateAsync()
      setStatusMessage(`Trash emptied. ${result.count} items affected.`)
    } catch {
      setStatusMessage('Failed to empty trash.')
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col p-4 sm:p-6">
      <AppHeader
        title="Trash"
        subtitle="Restore individual assets or permanently empty trash."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleRestoreSelected()}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
            >
              Restore Selected ({selectedIds.size})
            </button>
            <button
              type="button"
              onClick={() => void handleEmptyTrash()}
              className="rounded-lg border border-rose-200 px-3 py-2 text-sm text-rose-700"
            >
              Empty Trash
            </button>
          </div>
        }
      />

      {trashedBucketsQuery.isLoading ? (
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Loading trashed assets...
        </section>
      ) : null}

      {trashedBucketsQuery.isError ? (
        <section className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          Failed to load trash buckets.
        </section>
      ) : null}

      {!trashedBucketsQuery.isLoading && !trashedBucketsQuery.isError ? (
        <AssetGrid
          assets={trashedAssets}
          selectedIds={selectedIds}
          onSelectionChange={setAllSelected}
          onOpenAsset={setViewerIndex}
          emptyMessage="Trash is empty."
        />
      ) : null}

      {viewerIndex !== null ? (
        <AssetViewer assets={trashedAssets} initialIndex={viewerIndex} onClose={() => setViewerIndex(null)} />
      ) : null}

      {statusMessage ? (
        <p className="mt-4 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          {statusMessage}
        </p>
      ) : null}
    </main>
  )
}
