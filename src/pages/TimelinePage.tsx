import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  addAssetsToAlbum,
  AssetOrder,
  AssetVisibility,
  bulkTagAssets,
  createAlbum,
  createSharedLink,
  createTag,
  deleteAssets,
  downloadArchive,
  getAllAlbums,
  getAllTags,
  getTimeBucket,
  getTimeBuckets,
  SharedLinkType,
  updateAssets,
} from '@immich/sdk'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppHeader } from '../components/AppHeader'
import { AssetGrid } from '../components/AssetGrid'
import { BulkAlbumPicker } from '../components/BulkAlbumPicker'
import { BulkTagPicker } from '../components/BulkTagPicker'
import { BulkToolbar } from '../components/BulkToolbar'
import { AssetViewer } from '../components/AssetViewer'
import type { TimelineAsset } from '../components/AssetGrid'
import { useKeyboard } from '../hooks/useKeyboard'
import { getSharedLinkUrl } from '../api/client'
import { useAuthStore } from '../store/auth'
import { useSelectionStore } from '../store/selection'

export const TimelinePage = () => {
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const mode = useAuthStore((state) => state.mode)
  const logoutSession = useAuthStore((state) => state.logoutSession)
  const lockSession = useAuthStore((state) => state.lockSession)
  const isSessionLocked = useAuthStore((state) => state.isSessionLocked)
  const unlockSession = useAuthStore((state) => state.unlockSession)

  const selectedIds = useSelectionStore((state) => state.selectedIds)
  const setAllSelected = useSelectionStore((state) => state.setAll)
  const clearSelected = useSelectionStore((state) => state.clear)

  const [unlockInput, setUnlockInput] = useState('')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [isAlbumPickerOpen, setIsAlbumPickerOpen] = useState(false)
  const [isTagPickerOpen, setIsTagPickerOpen] = useState(false)

  const timeBucketsQuery = useQuery({
    queryKey: ['timeline', 'buckets'],
    queryFn: () => getTimeBuckets({ order: AssetOrder.Desc }),
    staleTime: 60_000,
  })

  const visibleBuckets = useMemo(
    () => (timeBucketsQuery.data ?? []).slice(0, 24),
    [timeBucketsQuery.data],
  )

  const bucketQueries = useQueries({
    queries: visibleBuckets.map((bucket) => ({
      queryKey: ['timeline', 'bucket', bucket.timeBucket],
      queryFn: () =>
        getTimeBucket({
          timeBucket: bucket.timeBucket,
          order: AssetOrder.Desc,
        }),
      staleTime: 60_000,
    })),
  })

  const timelineAssets = useMemo(() => {
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

  const bucketQueriesLoading = bucketQueries.some((query) => query.isLoading)
  const bucketQueriesError = bucketQueries.some((query) => query.isError)
  const selectedIdList = useMemo(() => Array.from(selectedIds), [selectedIds])

  const albumsQuery = useQuery({
    queryKey: ['albums', 'all'],
    queryFn: () => getAllAlbums({}),
    staleTime: 60_000,
  })

  const tagsQuery = useQuery({
    queryKey: ['tags', 'all'],
    queryFn: () => getAllTags(),
    staleTime: 60_000,
  })

  const bulkUpdateMutation = useMutation({
    mutationFn: ({ assetBulkUpdateDto }: Parameters<typeof updateAssets>[0]) =>
      updateAssets({ assetBulkUpdateDto }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['timeline'] })
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: ({ assetBulkDeleteDto }: Parameters<typeof deleteAssets>[0]) =>
      deleteAssets({ assetBulkDeleteDto }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['timeline'] })
    },
  })

  const addToAlbumMutation = useMutation({
    mutationFn: ({ id, bulkIdsDto }: Parameters<typeof addAssetsToAlbum>[0]) =>
      addAssetsToAlbum({ id, bulkIdsDto }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['albums'] })
      clearSelected()
    },
  })

  const createAlbumMutation = useMutation({
    mutationFn: ({ createAlbumDto }: Parameters<typeof createAlbum>[0]) => createAlbum({ createAlbumDto }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['albums'] })
      clearSelected()
    },
  })

  const tagMutation = useMutation({
    mutationFn: ({ tagBulkAssetsDto }: Parameters<typeof bulkTagAssets>[0]) =>
      bulkTagAssets({ tagBulkAssetsDto }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tags'] })
      clearSelected()
    },
  })

  const createTagMutation = useMutation({
    mutationFn: ({ tagCreateDto }: Parameters<typeof createTag>[0]) => createTag({ tagCreateDto }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tags'] })
      clearSelected()
    },
  })

  const shareMutation = useMutation({
    mutationFn: ({ sharedLinkCreateDto }: Parameters<typeof createSharedLink>[0]) =>
      createSharedLink({ sharedLinkCreateDto }),
  })

  const downloadMutation = useMutation({
    mutationFn: ({ downloadArchiveDto }: Parameters<typeof downloadArchive>[0]) =>
      downloadArchive({ downloadArchiveDto }),
  })

  const runBulkAction = async (label: string, action: () => Promise<void>) => {
    setBusyAction(label)
    setStatusMessage(null)

    try {
      await action()
      if (!statusMessage) {
        setStatusMessage(`${label} completed.`)
      }
    } catch {
      setStatusMessage(`${label} failed.`)
    } finally {
      setBusyAction(null)
    }
  }

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
  }

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

  useKeyboard([
    {
      key: 'a',
      ctrlOrMeta: true,
      handler: () => {
        setAllSelected(timelineAssets.map((asset) => asset.id))
      },
    },
    {
      key: 'Escape',
      handler: () => {
        clearSelected()
      },
    },
  ])

  const handleLogout = async () => {
    setStatusMessage(null)

    try {
      await logoutSession()
    } catch {
      setStatusMessage('Failed to logout from server session.')
    }
  }

  const handleLock = async () => {
    setStatusMessage(null)

    try {
      await lockSession()
      setStatusMessage('Session locked. Use PIN/password to unlock.')
    } catch {
      setStatusMessage('Unable to lock session. Configure PIN in Immich first.')
    }
  }

  const handleUnlock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatusMessage(null)

    try {
      const value = unlockInput.trim()
      const looksLikePin = /^\d{4,6}$/.test(value)

      await unlockSession({
        pinCode: looksLikePin ? value : undefined,
        password: looksLikePin ? undefined : value,
      })

      setUnlockInput('')
      setStatusMessage('Session unlocked.')
    } catch {
      setStatusMessage('Unlock failed. Check PIN/password and retry.')
    }
  }

  const handleBulkFavorite = async () => {
    await runBulkAction('Favorite assets', async () => {
      await bulkUpdateMutation.mutateAsync({
        assetBulkUpdateDto: { ids: selectedIdList, isFavorite: true },
      })
      setStatusMessage(`Marked ${selectedIdList.length} assets as favorite.`)
    })
  }

  const handleBulkArchive = async () => {
    await runBulkAction('Archive assets', async () => {
      await bulkUpdateMutation.mutateAsync({
        assetBulkUpdateDto: { ids: selectedIdList, visibility: AssetVisibility.Archive },
      })
      setStatusMessage(`Archived ${selectedIdList.length} assets.`)
    })
  }

  const handleBulkTrash = async () => {
    const confirmed = window.confirm(`Move ${selectedIdList.length} assets to trash?`)
    if (!confirmed) {
      return
    }

    await runBulkAction('Trash assets', async () => {
      await bulkDeleteMutation.mutateAsync({
        assetBulkDeleteDto: { ids: selectedIdList },
      })
      clearSelected()
      setStatusMessage(`Moved ${selectedIdList.length} assets to trash.`)
    })
  }

  const handleBulkDownload = async () => {
    await runBulkAction('Download ZIP', async () => {
      const blob = await downloadMutation.mutateAsync({
        downloadArchiveDto: { assetIds: selectedIdList },
      })
      downloadBlob(blob, `immichext-selection-${selectedIdList.length}.zip`)
      setStatusMessage(`Downloaded ${selectedIdList.length} selected assets.`)
    })
  }

  const handleBulkShare = async () => {
    await runBulkAction('Create share link', async () => {
      const response = await shareMutation.mutateAsync({
        sharedLinkCreateDto: {
          type: SharedLinkType.Individual,
          assetIds: selectedIdList,
          allowDownload: true,
          showMetadata: true,
        },
      })

      const sharedId = response.slug ?? response.key
      await copyText(getSharedLinkUrl(sharedId))
      setStatusMessage('Shared link created and copied to clipboard.')
    })
  }

  const handleAlbumSubmit = async (albumId: string) => {
    await runBulkAction('Add to album', async () => {
      await addToAlbumMutation.mutateAsync({
        id: albumId,
        bulkIdsDto: { ids: selectedIdList },
      })
      setStatusMessage(`Added ${selectedIdList.length} assets to album.`)
    })
  }

  const handleAlbumCreate = async (albumName: string) => {
    await runBulkAction('Create album', async () => {
      await createAlbumMutation.mutateAsync({
        createAlbumDto: {
          albumName,
          assetIds: selectedIdList,
        },
      })
      setStatusMessage(`Created album "${albumName}" with ${selectedIdList.length} assets.`)
    })
  }

  const handleTagSubmit = async (tagIds: string[]) => {
    await runBulkAction('Apply tags', async () => {
      await tagMutation.mutateAsync({
        tagBulkAssetsDto: {
          assetIds: selectedIdList,
          tagIds,
        },
      })
      setStatusMessage(`Tagged ${selectedIdList.length} assets.`)
    })
  }

  const handleTagCreate = async (tagName: string) => {
    await runBulkAction('Create tag', async () => {
      const tag = await createTagMutation.mutateAsync({
        tagCreateDto: { name: tagName },
      })
      await tagMutation.mutateAsync({
        tagBulkAssetsDto: {
          assetIds: selectedIdList,
          tagIds: [tag.id],
        },
      })
      setStatusMessage(`Created tag "${tagName}" and applied it to ${selectedIdList.length} assets.`)
    })
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col p-6">
      <AppHeader
        title="Timeline"
        subtitle={
          selectedIds.size > 0
            ? `${selectedIds.size} selected · Shift-click for ranges · Ctrl/Cmd-click to toggle · Ctrl/Cmd+A to select all`
            : `Signed in as ${user?.name ?? 'Unknown user'} (${mode === 'apiKey' ? 'API key' : 'Bearer token'})`
        }
        actions={
          <>
            <button
              type="button"
              onClick={handleLock}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Lock Session
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Logout
            </button>
          </>
        }
      />

      {isSessionLocked ? (
        <form
          onSubmit={handleUnlock}
          className="mt-6 max-w-md space-y-3 rounded-xl border border-slate-200 bg-white p-6"
        >
          <h2 className="text-base font-semibold text-slate-900">Session is locked</h2>
          <p className="text-sm text-slate-600">Enter PIN or password to unlock this session.</p>
          <input
            type="password"
            value={unlockInput}
            onChange={(event) => setUnlockInput(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="PIN or password"
            required
          />
          <button
            type="submit"
            className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white"
          >
            Unlock
          </button>
        </form>
      ) : null}

      {timeBucketsQuery.isLoading ? (
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Loading timeline buckets...
        </section>
      ) : null}

      {timeBucketsQuery.isError ? (
        <section className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          Failed to load timeline buckets. Confirm your Immich server is reachable.
        </section>
      ) : null}

      {bucketQueriesLoading ? (
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Loading assets from timeline buckets...
        </section>
      ) : null}

      {bucketQueriesError ? (
        <section className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          Failed to load one or more timeline buckets.
        </section>
      ) : null}

      <BulkToolbar
        selectedCount={selectedIdList.length}
        busyAction={busyAction}
        onAddToAlbum={() => setIsAlbumPickerOpen(true)}
        onTag={() => setIsTagPickerOpen(true)}
        onFavorite={() => void handleBulkFavorite()}
        onArchive={() => void handleBulkArchive()}
        onDownload={() => void handleBulkDownload()}
        onShare={() => void handleBulkShare()}
        onTrash={() => void handleBulkTrash()}
        onClear={clearSelected}
      />

      {!timeBucketsQuery.isLoading && !timeBucketsQuery.isError && !bucketQueriesLoading ? (
        <AssetGrid
          assets={timelineAssets}
          selectedIds={selectedIds}
          onSelectionChange={setAllSelected}
          onOpenAsset={setViewerIndex}
        />
      ) : null}

      <BulkAlbumPicker
        open={isAlbumPickerOpen}
        albumOptions={(albumsQuery.data ?? []).map((album) => ({
          id: album.id,
          name: album.albumName,
          count: album.assetCount,
        }))}
        selectedCount={selectedIdList.length}
        onClose={() => setIsAlbumPickerOpen(false)}
        onSubmit={handleAlbumSubmit}
        onCreate={handleAlbumCreate}
      />

      <BulkTagPicker
        open={isTagPickerOpen}
        tagOptions={(tagsQuery.data ?? []).map((tag) => ({
          id: tag.id,
          name: tag.name,
          value: tag.value,
        }))}
        selectedCount={selectedIdList.length}
        onClose={() => setIsTagPickerOpen(false)}
        onSubmit={handleTagSubmit}
        onCreate={handleTagCreate}
      />

      {viewerIndex !== null ? (
        <AssetViewer
          assets={timelineAssets}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      ) : null}

      {statusMessage ? (
        <p className="mt-4 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          {statusMessage}
        </p>
      ) : null}
    </main>
  )
}
