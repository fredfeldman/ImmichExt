import { useMemo, useState } from 'react'
import { createAlbum, deleteAlbum, getAllAlbums } from '@immich/sdk'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'

type AlbumFilter = 'all' | 'owned' | 'shared'

export const AlbumsPage = () => {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<AlbumFilter>('all')
  const [albumName, setAlbumName] = useState('')
  const [description, setDescription] = useState('')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const albumsQuery = useQuery({
    queryKey: ['albums', 'all'],
    queryFn: () => getAllAlbums({}),
    staleTime: 60_000,
  })

  const createAlbumMutation = useMutation({
    mutationFn: ({ createAlbumDto }: Parameters<typeof createAlbum>[0]) => createAlbum({ createAlbumDto }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['albums'] })
    },
  })

  const deleteAlbumMutation = useMutation({
    mutationFn: ({ id }: Parameters<typeof deleteAlbum>[0]) => deleteAlbum({ id }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['albums'] })
    },
  })

  const filteredAlbums = useMemo(() => {
    const albums = albumsQuery.data ?? []

    if (filter === 'owned') {
      return albums.filter((album) => !album.shared)
    }

    if (filter === 'shared') {
      return albums.filter((album) => album.shared)
    }

    return albums
  }, [albumsQuery.data, filter])

  const handleCreateAlbum = async () => {
    const value = albumName.trim()
    if (!value) {
      return
    }

    setStatusMessage(null)

    try {
      await createAlbumMutation.mutateAsync({
        createAlbumDto: {
          albumName: value,
          description: description.trim() || undefined,
        },
      })
      setAlbumName('')
      setDescription('')
      setStatusMessage(`Created album "${value}".`)
    } catch {
      setStatusMessage('Failed to create album.')
    }
  }

  const handleDeleteAlbum = async (id: string, name: string) => {
    const confirmed = window.confirm(`Delete album "${name}"?`)
    if (!confirmed) {
      return
    }

    setStatusMessage(null)

    try {
      await deleteAlbumMutation.mutateAsync({ id })
      setStatusMessage(`Deleted album "${name}".`)
    } catch {
      setStatusMessage('Failed to delete album.')
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col p-6">
      <AppHeader
        title="Albums"
        subtitle="Browse owned and shared albums, create new ones, and open album detail views."
      />

      <section className="mt-6 grid gap-6 lg:grid-cols-[320px,1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-base font-semibold text-slate-900">Create Album</h2>
          <div className="mt-3 space-y-3">
            <input
              value={albumName}
              onChange={(event) => setAlbumName(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Summer 2026"
            />
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Album description"
            />
            <button
              type="button"
              onClick={() => void handleCreateAlbum()}
              disabled={!albumName.trim() || createAlbumMutation.isPending}
              className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {createAlbumMutation.isPending ? 'Creating...' : 'Create Album'}
            </button>
          </div>

          <div className="mt-5 border-t border-slate-200 pt-4">
            <h3 className="text-sm font-semibold text-slate-900">Filter</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {(['all', 'owned', 'shared'] as AlbumFilter[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    filter === value
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-300 text-slate-700'
                  }`}
                >
                  {value[0].toUpperCase() + value.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section>
          {albumsQuery.isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
              Loading albums...
            </div>
          ) : null}

          {albumsQuery.isError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
              Failed to load albums.
            </div>
          ) : null}

          {!albumsQuery.isLoading && !albumsQuery.isError ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredAlbums.map((album) => (
                <article key={album.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link to={`/albums/${album.id}`} className="text-base font-semibold text-slate-900 hover:text-cyan-700">
                        {album.albumName}
                      </Link>
                      <p className="mt-1 text-sm text-slate-600">
                        {album.description || 'No description'}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${album.shared ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                      {album.shared ? 'Shared' : 'Owned'}
                    </span>
                  </div>

                  <dl className="mt-4 space-y-2 text-sm text-slate-600">
                    <div className="flex justify-between gap-2">
                      <dt>Assets</dt>
                      <dd>{album.assetCount}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt>Owner</dt>
                      <dd>{album.owner.name}</dd>
                    </div>
                  </dl>

                  <div className="mt-4 flex gap-2">
                    <Link
                      to={`/albums/${album.id}`}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
                    >
                      Open
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleDeleteAlbum(album.id, album.albumName)}
                      disabled={deleteAlbumMutation.isPending}
                      className="rounded-lg border border-rose-200 px-3 py-2 text-sm text-rose-700 disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </section>

      {statusMessage ? (
        <p className="mt-4 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          {statusMessage}
        </p>
      ) : null}
    </main>
  )
}
