import { useMemo, useState } from 'react'
import {
  addAssetsToAlbum,
  createSharedLink,
  deleteAlbum,
  getAlbumInfo,
  removeAssetFromAlbum,
  SharedLinkType,
  updateAlbumInfo,
} from '@immich/sdk'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { AssetGrid } from '../components/AssetGrid'
import { AssetViewer } from '../components/AssetViewer'
import { getSharedLinkUrl } from '../api/client'
import type { TimelineAsset } from '../components/AssetGrid'
import { useSelectionStore } from '../store/selection'

export const AlbumDetailPage = () => {
  const { albumId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const selectedIds = useSelectionStore((state) => state.selectedIds)
  const setAllSelected = useSelectionStore((state) => state.setAll)
  const clearSelected = useSelectionStore((state) => state.clear)

  const [albumName, setAlbumName] = useState('')
  const [description, setDescription] = useState('')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)

  const albumQuery = useQuery({
    queryKey: ['album', albumId],
    queryFn: () => getAlbumInfo({ id: albumId }),
    enabled: Boolean(albumId),
    staleTime: 60_000,
  })

  const updateAlbumMutation = useMutation({
    mutationFn: ({ id, updateAlbumDto }: Parameters<typeof updateAlbumInfo>[0]) =>
      updateAlbumInfo({ id, updateAlbumDto }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['album', albumId] })
      await queryClient.invalidateQueries({ queryKey: ['albums'] })
    },
  })

  const deleteAlbumMutation = useMutation({
    mutationFn: ({ id }: Parameters<typeof deleteAlbum>[0]) => deleteAlbum({ id }),
  })

  const addAssetsMutation = useMutation({
    mutationFn: ({ id, bulkIdsDto }: Parameters<typeof addAssetsToAlbum>[0]) =>
      addAssetsToAlbum({ id, bulkIdsDto }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['album', albumId] })
    },
  })

  const removeAssetsMutation = useMutation({
    mutationFn: ({ id, bulkIdsDto }: Parameters<typeof removeAssetFromAlbum>[0]) =>
      removeAssetFromAlbum({ id, bulkIdsDto }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['album', albumId] })
    },
  })

  const shareMutation = useMutation({
    mutationFn: ({ sharedLinkCreateDto }: Parameters<typeof createSharedLink>[0]) =>
      createSharedLink({ sharedLinkCreateDto }),
  })

  const albumAssets = useMemo<TimelineAsset[]>(() => {
    const assets = albumQuery.data?.assets ?? []
    return assets.map((asset) => ({
      id: asset.id,
      fileCreatedAt: asset.fileCreatedAt,
      isImage: asset.type === 'IMAGE',
      isFavorite: asset.isFavorite,
      duration: asset.duration,
      thumbhash: asset.thumbhash,
    }))
  }, [albumQuery.data])

  const selectedIdList = useMemo(() => Array.from(selectedIds), [selectedIds])
  const albumAssetIdSet = useMemo(() => new Set(albumAssets.map((asset) => asset.id)), [albumAssets])
  const selectedInsideAlbum = useMemo(
    () => selectedIdList.filter((id) => albumAssetIdSet.has(id)),
    [albumAssetIdSet, selectedIdList],
  )
  const selectedOutsideAlbum = useMemo(
    () => selectedIdList.filter((id) => !albumAssetIdSet.has(id)),
    [albumAssetIdSet, selectedIdList],
  )

  const copyText = async (value: string) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      return
    }

    const textArea = document.createElement('textarea')
    textArea.value = value
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    textArea.remove()
  }

  const handleSaveAlbum = async () => {
    if (!albumQuery.data) {
      return
    }

    try {
      await updateAlbumMutation.mutateAsync({
        id: albumQuery.data.id,
        updateAlbumDto: {
          albumName: albumName.trim() || undefined,
          description: description.trim() || undefined,
        },
      })
      setStatusMessage('Album updated.')
    } catch {
      setStatusMessage('Failed to update album.')
    }
  }

  const handleDeleteAlbum = async () => {
    if (!albumQuery.data) {
      return
    }

    const confirmed = window.confirm(`Delete album "${albumQuery.data.albumName}"?`)
    if (!confirmed) {
      return
    }

    try {
      await deleteAlbumMutation.mutateAsync({ id: albumQuery.data.id })
      navigate('/albums', { replace: true })
    } catch {
      setStatusMessage('Failed to delete album.')
    }
  }

  const handleShareAlbum = async () => {
    if (!albumQuery.data) {
      return
    }

    try {
      const response = await shareMutation.mutateAsync({
        sharedLinkCreateDto: {
          type: SharedLinkType.Album,
          albumId: albumQuery.data.id,
          allowDownload: true,
          showMetadata: true,
        },
      })

      const sharedId = response.slug ?? response.key
      await copyText(getSharedLinkUrl(sharedId))
      setStatusMessage('Album share link copied to clipboard.')
    } catch {
      setStatusMessage('Failed to create album share link.')
    }
  }

  const handleAddSelected = async () => {
    if (!albumQuery.data || !selectedOutsideAlbum.length) {
      return
    }

    try {
      await addAssetsMutation.mutateAsync({
        id: albumQuery.data.id,
        bulkIdsDto: { ids: selectedOutsideAlbum },
      })
      setStatusMessage(`Added ${selectedOutsideAlbum.length} selected assets to album.`)
    } catch {
      setStatusMessage('Failed to add assets to album.')
    }
  }

  const handleRemoveSelected = async () => {
    if (!albumQuery.data || !selectedInsideAlbum.length) {
      return
    }

    try {
      await removeAssetsMutation.mutateAsync({
        id: albumQuery.data.id,
        bulkIdsDto: { ids: selectedInsideAlbum },
      })
      clearSelected()
      setStatusMessage(`Removed ${selectedInsideAlbum.length} assets from album.`)
    } catch {
      setStatusMessage('Failed to remove assets from album.')
    }
  }

  const actions = (
    <>
      <button
        type="button"
        onClick={() => void handleShareAlbum()}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
      >
        Share Album
      </button>
      <button
        type="button"
        onClick={() => void handleDeleteAlbum()}
        className="rounded-lg border border-rose-200 px-3 py-2 text-sm text-rose-700"
      >
        Delete Album
      </button>
    </>
  )

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col p-6">
      <AppHeader
        title={albumQuery.data?.albumName ?? 'Album Detail'}
        subtitle={albumQuery.data?.shared ? 'Shared album view' : 'Owned album view'}
        actions={actions}
      />

      {albumQuery.isLoading ? (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Loading album...
        </section>
      ) : null}

      {albumQuery.isError ? (
        <section className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          Failed to load album. Go back to <Link to="/albums" className="underline">albums</Link>.
        </section>
      ) : null}

      {albumQuery.data ? (
        <>
          <section className="mt-6 grid gap-6 lg:grid-cols-[340px,1fr]">
            <aside className="rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="text-base font-semibold text-slate-900">Album Settings</h2>
              <div className="mt-3 space-y-3">
                <input
                  value={albumName}
                  onChange={(event) => setAlbumName(event.target.value)}
                  placeholder={albumQuery.data.albumName}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder={albumQuery.data.description || 'Album description'}
                  className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => void handleSaveAlbum()}
                  disabled={updateAlbumMutation.isPending}
                  className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Save Changes
                </button>
              </div>

              <div className="mt-5 border-t border-slate-200 pt-4 text-sm text-slate-600">
                <p>Assets in album: {albumQuery.data.assetCount}</p>
                <p>Owner: {albumQuery.data.owner.name}</p>
                <p>Status: {albumQuery.data.shared ? 'Shared' : 'Owned'}</p>
              </div>

              <div className="mt-5 border-t border-slate-200 pt-4 space-y-2">
                <button
                  type="button"
                  onClick={() => void handleAddSelected()}
                  disabled={!selectedOutsideAlbum.length || addAssetsMutation.isPending}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:opacity-60"
                >
                  Add {selectedOutsideAlbum.length} Selected Assets
                </button>
                <button
                  type="button"
                  onClick={() => void handleRemoveSelected()}
                  disabled={!selectedInsideAlbum.length || removeAssetsMutation.isPending}
                  className="w-full rounded-lg border border-rose-200 px-3 py-2 text-sm text-rose-700 disabled:opacity-60"
                >
                  Remove {selectedInsideAlbum.length} Selected Album Assets
                </button>
              </div>
            </aside>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900">Album Assets</h2>
                <span className="text-xs text-slate-500">
                  Double-click to open viewer · Use global selection to add/remove assets
                </span>
              </div>

              <AssetGrid
                assets={albumAssets}
                selectedIds={selectedIds}
                onSelectionChange={setAllSelected}
                onOpenAsset={setViewerIndex}
              />
            </section>
          </section>

          {viewerIndex !== null ? (
            <AssetViewer
              assets={albumAssets}
              initialIndex={viewerIndex}
              onClose={() => setViewerIndex(null)}
            />
          ) : null}
        </>
      ) : null}

      {statusMessage ? (
        <p className="mt-4 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          {statusMessage}
        </p>
      ) : null}
    </main>
  )
}
