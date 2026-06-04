import { useMemo, useState } from 'react'
import { deleteAssets, getAssetDuplicates, resolveDuplicates } from '@immich/sdk'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppHeader } from '../components/AppHeader'
import { getAssetThumbnailUrl } from '../api/client'

export const DuplicatesPage = () => {
  const queryClient = useQueryClient()
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const duplicatesQuery = useQuery({
    queryKey: ['duplicates', 'groups'],
    queryFn: () => getAssetDuplicates(),
    staleTime: 30_000,
  })

  const resolveMutation = useMutation({
    mutationFn: ({ duplicateResolveDto }: Parameters<typeof resolveDuplicates>[0]) =>
      resolveDuplicates({ duplicateResolveDto }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['duplicates'] })
      await queryClient.invalidateQueries({ queryKey: ['timeline'] })
    },
  })

  const trashMutation = useMutation({
    mutationFn: ({ assetBulkDeleteDto }: Parameters<typeof deleteAssets>[0]) =>
      deleteAssets({ assetBulkDeleteDto }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['duplicates'] })
      await queryClient.invalidateQueries({ queryKey: ['timeline'] })
    },
  })

  const duplicateStats = useMemo(() => {
    const groups = duplicatesQuery.data ?? []
    const totalAssets = groups.reduce((total, group) => total + group.assets.length, 0)
    return { groups: groups.length, totalAssets }
  }, [duplicatesQuery.data])

  const handleResolveGroup = async (duplicateId: string, keepAssetIds: string[], allAssetIds: string[]) => {
    const trashAssetIds = allAssetIds.filter((id) => !keepAssetIds.includes(id))
    if (!trashAssetIds.length) {
      setStatusMessage('No assets to trash for this group.')
      return
    }

    setStatusMessage(null)

    try {
      await resolveMutation.mutateAsync({
        duplicateResolveDto: {
          groups: [
            {
              duplicateId,
              keepAssetIds,
              trashAssetIds,
            },
          ],
        },
      })
      setStatusMessage('Duplicate group resolved.')
    } catch {
      setStatusMessage('Failed to resolve duplicate group.')
    }
  }

  const handleTrashExcept = async (keepId: string, allIds: string[]) => {
    const ids = allIds.filter((id) => id !== keepId)
    if (!ids.length) {
      return
    }

    setStatusMessage(null)

    try {
      await trashMutation.mutateAsync({ assetBulkDeleteDto: { ids } })
      setStatusMessage(`Moved ${ids.length} assets to trash.`)
    } catch {
      setStatusMessage('Failed to move duplicate assets to trash.')
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col p-4 sm:p-6">
      <AppHeader
        title="Duplicates"
        subtitle={`Review duplicate groups and keep the best asset (${duplicateStats.groups} groups, ${duplicateStats.totalAssets} assets).`}
      />

      {duplicatesQuery.isLoading ? (
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Detecting duplicate groups...
        </section>
      ) : null}

      {duplicatesQuery.isError ? (
        <section className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          Failed to load duplicate groups.
        </section>
      ) : null}

      {!duplicatesQuery.isLoading && !duplicatesQuery.isError ? (
        <section className="mt-6 space-y-4">
          {(duplicatesQuery.data ?? []).map((group) => {
            const allIds = group.assets.map((asset) => asset.id)

            return (
              <article key={group.duplicateId} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Group {group.duplicateId.slice(0, 8)} · {group.assets.length} assets
                  </h2>
                  <button
                    type="button"
                    onClick={() => void handleResolveGroup(group.duplicateId, group.suggestedKeepAssetIds, allIds)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700"
                  >
                    Auto Resolve Suggested
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {group.assets.map((asset) => {
                    const suggested = group.suggestedKeepAssetIds.includes(asset.id)

                    return (
                      <div key={asset.id} className="rounded-xl border border-slate-200 p-2">
                        <img
                          src={getAssetThumbnailUrl(asset.id, 'preview')}
                          alt=""
                          className="h-32 w-full rounded-lg bg-slate-100 object-cover"
                        />
                        <div className="mt-2 space-y-1 text-xs text-slate-600">
                          <p className="truncate">{asset.originalFileName}</p>
                          <p>{new Date(asset.fileCreatedAt).toLocaleString()}</p>
                          <p>{Math.round(asset.exifInfo?.fileSizeInByte ? asset.exifInfo.fileSizeInByte / 1024 / 1024 : 0)} MB</p>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void handleResolveGroup(group.duplicateId, [asset.id], allIds)}
                            className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700"
                          >
                            Keep This
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleTrashExcept(asset.id, allIds)}
                            className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-700"
                          >
                            Trash Others
                          </button>
                          {suggested ? (
                            <span className="rounded bg-cyan-100 px-2 py-1 text-xs font-semibold text-cyan-800">
                              Suggested Keep
                            </span>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </article>
            )
          })}

          {(duplicatesQuery.data ?? []).length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
              No duplicates detected.
            </div>
          ) : null}
        </section>
      ) : null}

      {statusMessage ? (
        <p className="mt-4 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          {statusMessage}
        </p>
      ) : null}
    </main>
  )
}
