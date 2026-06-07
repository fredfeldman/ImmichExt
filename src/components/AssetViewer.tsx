import { useEffect, useMemo, useState } from 'react'
import {
  AssetVisibility,
  createSharedLink,
  deleteAssets,
  getAssetInfo,
  SharedLinkType,
  updateAsset,
} from '@immich/sdk'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import type { TimelineAsset } from './AssetGrid'
import { useKeyboard } from '../hooks/useKeyboard'
import {
  getAssetOriginalUrl,
  getAssetThumbnailUrl,
  getAssetVideoPlaybackUrl,
  getSharedLinkUrl,
} from '../api/client'
import { CommentPanel } from './CommentPanel'

type AssetViewerProps = {
  assets: TimelineAsset[]
  initialIndex: number
  onClose: () => void
}

const clampIndex = (value: number, max: number): number => {
  if (max <= 0) {
    return 0
  }

  if (value < 0) {
    return 0
  }

  if (value >= max) {
    return max - 1
  }

  return value
}

const browserSupportedImageMimes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/avif',
  'image/svg+xml',
])

const canRenderImageDirectly = (mimeType: string | null | undefined): boolean => {
  if (!mimeType) {
    return false
  }

  return browserSupportedImageMimes.has(mimeType.toLowerCase())
}

export const AssetViewer = ({ assets, initialIndex, onClose }: AssetViewerProps) => {
  const [index, setIndex] = useState(() => clampIndex(initialIndex, assets.length))
  const [zoom, setZoom] = useState(1)
  const [commentFocusSignal, setCommentFocusSignal] = useState(0)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const activeAsset = assets[index]

  useEffect(() => {
    setIndex(clampIndex(initialIndex, assets.length))
  }, [initialIndex, assets.length])

  useEffect(() => {
    setZoom(1)
  }, [activeAsset?.id])

  const assetQuery = useQuery({
    queryKey: ['asset', activeAsset?.id],
    queryFn: () => getAssetInfo({ id: activeAsset.id }),
    enabled: Boolean(activeAsset?.id),
  })

  const updateAssetMutation = useMutation({
    mutationFn: ({ id, updateAssetDto }: Parameters<typeof updateAsset>[0]) =>
      updateAsset({ id, updateAssetDto }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['asset', activeAsset?.id] })
      void queryClient.invalidateQueries({ queryKey: ['timeline'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: ({ assetBulkDeleteDto }: Parameters<typeof deleteAssets>[0]) =>
      deleteAssets({ assetBulkDeleteDto }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['timeline'] })
      onClose()
    },
  })

  const shareMutation = useMutation({
    mutationFn: ({ sharedLinkCreateDto }: Parameters<typeof createSharedLink>[0]) =>
      createSharedLink({ sharedLinkCreateDto }),
  })

  const goPrevious = () => {
    setIndex((value) => (value <= 0 ? assets.length - 1 : value - 1))
  }

  const goNext = () => {
    setIndex((value) => (value >= assets.length - 1 ? 0 : value + 1))
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

  const handleShare = async () => {
    if (!activeAsset?.id) {
      return
    }

    setStatusMessage(null)

    try {
      const shared = await shareMutation.mutateAsync({
        sharedLinkCreateDto: {
          type: SharedLinkType.Individual,
          assetIds: [activeAsset.id],
          allowDownload: true,
          showMetadata: true,
        },
      })

      const shareId = shared.slug ?? shared.key
      await copyText(getSharedLinkUrl(shareId))
      setStatusMessage('Share link copied to clipboard.')
    } catch {
      setStatusMessage('Failed to create share link.')
    }
  }

  useKeyboard([
    {
      key: 'Escape',
      handler: () => {
        onClose()
      },
    },
    {
      key: 'ArrowLeft',
      handler: () => {
        goPrevious()
      },
    },
    {
      key: 'ArrowRight',
      handler: () => {
        goNext()
      },
    },
    {
      key: 'c',
      handler: () => {
        setCommentFocusSignal((value) => value + 1)
      },
    },
    {
      key: 'f',
      handler: () => {
        if (!assetQuery.data) {
          return
        }

        void updateAssetMutation.mutateAsync({
          id: assetQuery.data.id,
          updateAssetDto: { isFavorite: !assetQuery.data.isFavorite },
        })
      },
    },
    {
      key: 'a',
      handler: () => {
        if (!assetQuery.data) {
          return
        }

        const nextVisibility =
          assetQuery.data.visibility === AssetVisibility.Archive
            ? AssetVisibility.Timeline
            : AssetVisibility.Archive

        void updateAssetMutation.mutateAsync({
          id: assetQuery.data.id,
          updateAssetDto: { visibility: nextVisibility },
        })
      },
    },
    {
      key: 's',
      handler: () => {
        void handleShare()
      },
    },
    {
      key: '0',
      handler: () => {
        if (!assetQuery.data) {
          return
        }

        void updateAssetMutation.mutateAsync({
          id: assetQuery.data.id,
          updateAssetDto: { rating: null },
        })
      },
    },
    {
      key: '1',
      handler: () => {
        if (!assetQuery.data) {
          return
        }

        void updateAssetMutation.mutateAsync({
          id: assetQuery.data.id,
          updateAssetDto: { rating: 1 },
        })
      },
    },
    {
      key: '2',
      handler: () => {
        if (!assetQuery.data) {
          return
        }

        void updateAssetMutation.mutateAsync({
          id: assetQuery.data.id,
          updateAssetDto: { rating: 2 },
        })
      },
    },
    {
      key: '3',
      handler: () => {
        if (!assetQuery.data) {
          return
        }

        void updateAssetMutation.mutateAsync({
          id: assetQuery.data.id,
          updateAssetDto: { rating: 3 },
        })
      },
    },
    {
      key: '4',
      handler: () => {
        if (!assetQuery.data) {
          return
        }

        void updateAssetMutation.mutateAsync({
          id: assetQuery.data.id,
          updateAssetDto: { rating: 4 },
        })
      },
    },
    {
      key: '5',
      handler: () => {
        if (!assetQuery.data) {
          return
        }

        void updateAssetMutation.mutateAsync({
          id: assetQuery.data.id,
          updateAssetDto: { rating: 5 },
        })
      },
    },
    {
      key: 'Delete',
      handler: () => {
        if (!assetQuery.data) {
          return
        }

        const confirmed = window.confirm('Move this asset to trash?')
        if (!confirmed) {
          return
        }

        void deleteMutation.mutateAsync({
          assetBulkDeleteDto: {
            ids: [assetQuery.data.id],
          },
        })
      },
    },
  ])

  const metadata = useMemo(() => {
    if (!assetQuery.data) {
      return null
    }

    const data = assetQuery.data
    return {
      fileName: data.originalFileName,
      createdAt: format(new Date(data.fileCreatedAt), 'PPpp'),
      dimensions: data.width && data.height ? `${data.width} x ${data.height}` : 'Unknown',
      mimeType: data.originalMimeType ?? 'Unknown',
      favorite: data.isFavorite ? 'Yes' : 'No',
      archived: data.isArchived ? 'Yes' : 'No',
      rating: data.exifInfo?.rating ?? null,
      location:
        data.exifInfo?.city || data.exifInfo?.country
          ? [data.exifInfo?.city, data.exifInfo?.country].filter(Boolean).join(', ')
          : 'Unknown',
      description: data.exifInfo?.description ?? 'None',
    }
  }, [assetQuery.data])

  const imageSource = useMemo(() => {
    if (!activeAsset?.isImage) {
      return null
    }

    const mimeType = assetQuery.data?.originalMimeType

    if (canRenderImageDirectly(mimeType)) {
      return getAssetOriginalUrl(activeAsset.id)
    }

    // RAW and other unsupported formats (for example CR3) use Immich preview rendering.
    return getAssetThumbnailUrl(activeAsset.id, 'preview')
  }, [activeAsset?.id, activeAsset?.isImage, assetQuery.data?.originalMimeType])

  if (!activeAsset) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-slate-950/90">
      <section className="relative flex flex-1 items-center justify-center p-4">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full border border-slate-500 px-3 py-1 text-sm text-slate-200"
        >
          Close
        </button>

        <button
          type="button"
          onClick={goPrevious}
          className="absolute left-4 rounded-full border border-slate-500 px-3 py-2 text-sm text-slate-200"
          aria-label="Previous asset"
        >
          ←
        </button>

        <button
          type="button"
          onClick={goNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-slate-500 px-3 py-2 text-sm text-slate-200"
          aria-label="Next asset"
        >
          →
        </button>

        <div className="mx-auto flex h-full w-full max-w-5xl items-center justify-center rounded-xl bg-black/35 p-6">
          {activeAsset.isImage ? (
            <img
              src={imageSource ?? getAssetThumbnailUrl(activeAsset.id, 'preview')}
              alt=""
              className="max-h-full max-w-full object-contain transition"
              style={{ transform: `scale(${zoom})` }}
            />
          ) : (
            <video
              className="max-h-full max-w-full rounded-lg"
              controls
              autoPlay
              src={getAssetVideoPlaybackUrl(activeAsset.id)}
            />
          )}
        </div>

        {activeAsset.isImage ? (
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-slate-500 bg-slate-900/80 px-2 py-1">
            <button
              type="button"
              onClick={() => setZoom((value) => Math.max(0.5, Number((value - 0.1).toFixed(2))))}
              className="rounded border border-slate-500 px-2 py-1 text-xs text-slate-200"
            >
              -
            </button>
            <span className="text-xs text-slate-200">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              onClick={() => setZoom((value) => Math.min(4, Number((value + 0.1).toFixed(2))))}
              className="rounded border border-slate-500 px-2 py-1 text-xs text-slate-200"
            >
              +
            </button>
          </div>
        ) : null}
      </section>

      <aside className="h-full w-90 overflow-auto border-l border-slate-800 bg-slate-100 p-4">
        <h2 className="text-base font-semibold text-slate-900">Asset Details</h2>
        <p className="mt-1 text-xs text-slate-600">
          Use keyboard: ←/→ navigate, C comment, F favorite, A archive, 0-5 rating, Del trash
        </p>

        {assetQuery.isLoading ? (
          <p className="mt-4 text-sm text-slate-600">Loading metadata...</p>
        ) : null}

        {assetQuery.isError ? (
          <p className="mt-4 rounded border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">
            Failed to load asset metadata.
          </p>
        ) : null}

        {metadata ? (
          <dl className="mt-4 space-y-2 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">File</dt>
              <dd className="text-slate-800">{metadata.fileName}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Taken</dt>
              <dd className="text-slate-800">{metadata.createdAt}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Dimensions</dt>
              <dd className="text-slate-800">{metadata.dimensions}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Type</dt>
              <dd className="text-slate-800">{metadata.mimeType}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Favorite</dt>
              <dd className="text-slate-800">{metadata.favorite}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Archived</dt>
              <dd className="text-slate-800">{metadata.archived}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Rating</dt>
              <dd className="text-slate-800">{metadata.rating ?? 'Unrated'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Location</dt>
              <dd className="text-slate-800">{metadata.location}</dd>
            </div>
          </dl>
        ) : null}

        {statusMessage ? (
          <p className="mt-3 rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700">
            {statusMessage}
          </p>
        ) : null}

        <CommentPanel assetId={activeAsset.id} focusSignal={commentFocusSignal} />
      </aside>
    </div>
  )
}
