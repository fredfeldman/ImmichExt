import { useMemo, useState } from 'react'
import {
  createSharedLink,
  getAllAlbums,
  getAllSharedLinks,
  removeSharedLink,
  SharedLinkType,
  updateSharedLink,
} from '@immich/sdk'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { getSharedLinkUrl } from '../api/client'

type LinkMode = 'album' | 'assets'

export const SharingPage = () => {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<LinkMode>('album')
  const [albumId, setAlbumId] = useState('')
  const [assetIdsInput, setAssetIdsInput] = useState('')
  const [description, setDescription] = useState('')
  const [password, setPassword] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [allowDownload, setAllowDownload] = useState(true)
  const [showMetadata, setShowMetadata] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const albumsQuery = useQuery({
    queryKey: ['albums', 'all'],
    queryFn: () => getAllAlbums({}),
    staleTime: 60_000,
  })

  const sharedLinksQuery = useQuery({
    queryKey: ['sharing', 'links'],
    queryFn: () => getAllSharedLinks({}),
    staleTime: 30_000,
  })

  const createLinkMutation = useMutation({
    mutationFn: ({ sharedLinkCreateDto }: Parameters<typeof createSharedLink>[0]) =>
      createSharedLink({ sharedLinkCreateDto }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['sharing', 'links'] })
    },
  })

  const updateLinkMutation = useMutation({
    mutationFn: ({ id, sharedLinkEditDto }: Parameters<typeof updateSharedLink>[0]) =>
      updateSharedLink({ id, sharedLinkEditDto }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['sharing', 'links'] })
    },
  })

  const removeLinkMutation = useMutation({
    mutationFn: ({ id }: Parameters<typeof removeSharedLink>[0]) => removeSharedLink({ id }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['sharing', 'links'] })
    },
  })

  const parsedAssetIds = useMemo(
    () => assetIdsInput.split(',').map((value) => value.trim()).filter(Boolean),
    [assetIdsInput],
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

  const resetForm = () => {
    setEditingId(null)
    setDescription('')
    setPassword('')
    setExpiresAt('')
    setAllowDownload(true)
    setShowMetadata(true)
    setAlbumId('')
    setAssetIdsInput('')
    setMode('album')
  }

  const handleCreateLink = async () => {
    const sharedLinkCreateDto = {
      type: mode === 'album' ? SharedLinkType.Album : SharedLinkType.Individual,
      albumId: mode === 'album' ? albumId || undefined : undefined,
      assetIds: mode === 'assets' ? parsedAssetIds : undefined,
      description: description.trim() || undefined,
      password: password.trim() || undefined,
      expiresAt: expiresAt || undefined,
      allowDownload,
      showMetadata,
    }

    if (mode === 'album' && !albumId) {
      setStatusMessage('Select an album to share.')
      return
    }

    if (mode === 'assets' && !parsedAssetIds.length) {
      setStatusMessage('Enter one or more asset IDs to share.')
      return
    }

    setStatusMessage(null)

    try {
      const response = await createLinkMutation.mutateAsync({ sharedLinkCreateDto })
      const shareId = response.slug ?? response.key
      await copyText(getSharedLinkUrl(shareId))
      setStatusMessage('Shared link created and copied to clipboard.')
      resetForm()
    } catch {
      setStatusMessage('Failed to create shared link.')
    }
  }

  const startEditing = (linkId: string, link: NonNullable<typeof sharedLinksQuery.data>[number]) => {
    setEditingId(linkId)
    setDescription(link.description ?? '')
    setPassword(link.password ?? '')
    setExpiresAt(link.expiresAt ? link.expiresAt.slice(0, 10) : '')
    setAllowDownload(link.allowDownload)
    setShowMetadata(link.showMetadata)
    if (link.album) {
      setMode('album')
      setAlbumId(link.album.id)
      setAssetIdsInput('')
    } else {
      setMode('assets')
      setAlbumId('')
      setAssetIdsInput(link.assets.map((asset) => asset.id).join(', '))
    }
  }

  const handleUpdateLink = async () => {
    if (!editingId) {
      return
    }

    setStatusMessage(null)

    try {
      await updateLinkMutation.mutateAsync({
        id: editingId,
        sharedLinkEditDto: {
          description: description.trim() || undefined,
          password: password.trim() || undefined,
          expiresAt: expiresAt || undefined,
          changeExpiryTime: true,
          allowDownload,
          showMetadata,
        },
      })
      setStatusMessage('Shared link updated.')
      resetForm()
    } catch {
      setStatusMessage('Failed to update shared link.')
    }
  }

  const handleDeleteLink = async (id: string) => {
    const confirmed = window.confirm('Delete this shared link?')
    if (!confirmed) {
      return
    }

    setStatusMessage(null)

    try {
      await removeLinkMutation.mutateAsync({ id })
      setStatusMessage('Shared link deleted.')
      if (editingId === id) {
        resetForm()
      }
    } catch {
      setStatusMessage('Failed to delete shared link.')
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col p-6">
      <AppHeader
        title="Sharing"
        subtitle="Create, edit, and remove shared links for albums or individual assets."
        actions={
          <Link to="/sharing/partners" className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700">
            Manage Partners
          </Link>
        }
      />

      <section className="mt-6 grid gap-6 lg:grid-cols-[360px,1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode('album')}
              className={`rounded-lg px-3 py-2 text-sm ${mode === 'album' ? 'bg-slate-900 text-white' : 'border border-slate-300 text-slate-700'}`}
            >
              Album Link
            </button>
            <button
              type="button"
              onClick={() => setMode('assets')}
              className={`rounded-lg px-3 py-2 text-sm ${mode === 'assets' ? 'bg-slate-900 text-white' : 'border border-slate-300 text-slate-700'}`}
            >
              Asset Link
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {mode === 'album' ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Album</label>
                <select
                  value={albumId}
                  onChange={(event) => setAlbumId(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Select album</option>
                  {(albumsQuery.data ?? []).map((album) => (
                    <option key={album.id} value={album.id}>{album.albumName}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Asset IDs</label>
                <textarea
                  value={assetIdsInput}
                  onChange={(event) => setAssetIdsInput(event.target.value)}
                  className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="comma,separated,asset,ids"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
              <input value={description} onChange={(event) => setDescription(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
                <input type="text" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Expires</label>
                <input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={allowDownload} onChange={(event) => setAllowDownload(event.target.checked)} />
              Allow download
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={showMetadata} onChange={(event) => setShowMetadata(event.target.checked)} />
              Show metadata
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void (editingId ? handleUpdateLink() : handleCreateLink())}
                className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white"
              >
                {editingId ? 'Save Changes' : 'Create Link'}
              </button>
              {editingId ? (
                <button type="button" onClick={resetForm} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700">
                  Cancel
                </button>
              ) : null}
            </div>
          </div>
        </aside>

        <section>
          {sharedLinksQuery.isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading shared links...</div>
          ) : null}

          {sharedLinksQuery.isError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">Failed to load shared links.</div>
          ) : null}

          {!sharedLinksQuery.isLoading && !sharedLinksQuery.isError ? (
            <div className="space-y-4">
              {(sharedLinksQuery.data ?? []).map((link) => {
                const shareId = link.slug ?? link.key
                return (
                  <article key={link.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-base font-semibold text-slate-900">
                          {link.album?.albumName ?? `${link.assets.length} shared assets`}
                        </h2>
                        <p className="mt-1 text-sm text-slate-600">{link.description || 'No description'}</p>
                        <a href={getSharedLinkUrl(shareId)} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-cyan-700 underline">
                          Open share link
                        </a>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                        {link.type}
                      </span>
                    </div>

                    <dl className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                      <div><dt className="font-medium text-slate-900">Downloads</dt><dd>{link.allowDownload ? 'Allowed' : 'Disabled'}</dd></div>
                      <div><dt className="font-medium text-slate-900">Metadata</dt><dd>{link.showMetadata ? 'Visible' : 'Hidden'}</dd></div>
                      <div><dt className="font-medium text-slate-900">Expires</dt><dd>{link.expiresAt ? new Date(link.expiresAt).toLocaleString() : 'Never'}</dd></div>
                      <div><dt className="font-medium text-slate-900">Password</dt><dd>{link.password ? 'Protected' : 'None'}</dd></div>
                    </dl>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" onClick={() => startEditing(link.id, link)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700">Edit</button>
                      <button type="button" onClick={() => void copyText(getSharedLinkUrl(shareId))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700">Copy URL</button>
                      <button type="button" onClick={() => void handleDeleteLink(link.id)} className="rounded-lg border border-rose-200 px-3 py-2 text-sm text-rose-700">Delete</button>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : null}
        </section>
      </section>

      {statusMessage ? <p className="mt-4 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">{statusMessage}</p> : null}
    </main>
  )
}
