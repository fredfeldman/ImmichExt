import { useEffect, useMemo, useState } from 'react'
import { AssetOrder, AssetTypeEnum, deletePerson, getAllPeople, searchAssets, updatePerson } from '@immich/sdk'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppHeader } from '../components/AppHeader'
import { AssetGrid } from '../components/AssetGrid'
import { AssetViewer } from '../components/AssetViewer'
import type { TimelineAsset } from '../components/AssetGrid'
import { getImmichBaseUrl } from '../api/client'
import { useSelectionStore } from '../store/selection'

const toPersonThumbnailUrl = (thumbnailPath: string): string => {
  if (!thumbnailPath) {
    return ''
  }

  if (thumbnailPath.startsWith('http://') || thumbnailPath.startsWith('https://')) {
    return thumbnailPath
  }

  const base = getImmichBaseUrl()
  const normalizedPath = thumbnailPath.startsWith('/') ? thumbnailPath : `/${thumbnailPath}`
  return `${base}${normalizedPath}`
}

export const PeoplePage = () => {
  const queryClient = useQueryClient()
  const selectedIds = useSelectionStore((state) => state.selectedIds)
  const setAllSelected = useSelectionStore((state) => state.setAll)
  const clearSelected = useSelectionStore((state) => state.clear)

  const [searchText, setSearchText] = useState('')
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)
  const [personNameDraft, setPersonNameDraft] = useState('')
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const peopleQuery = useQuery({
    queryKey: ['people', 'all'],
    queryFn: () => getAllPeople({ page: 1, size: 500, withHidden: false }),
    staleTime: 60_000,
  })

  const filteredPeople = useMemo(() => {
    const people = peopleQuery.data?.people ?? []
    const query = searchText.trim().toLowerCase()

    if (!query) {
      return people
    }

    return people.filter((person) => person.name.toLowerCase().includes(query))
  }, [peopleQuery.data?.people, searchText])

  useEffect(() => {
    if (!filteredPeople.length) {
      setSelectedPersonId(null)
      return
    }

    if (!selectedPersonId || !filteredPeople.some((person) => person.id === selectedPersonId)) {
      setSelectedPersonId(filteredPeople[0].id)
    }
  }, [filteredPeople, selectedPersonId])

  const selectedPerson = useMemo(
    () => (peopleQuery.data?.people ?? []).find((person) => person.id === selectedPersonId) ?? null,
    [peopleQuery.data?.people, selectedPersonId],
  )

  useEffect(() => {
    setPersonNameDraft(selectedPerson?.name ?? '')
  }, [selectedPerson?.id, selectedPerson?.name])

  const personAssetsQuery = useQuery({
    queryKey: ['people', 'assets', selectedPersonId],
    queryFn: () =>
      searchAssets({
        metadataSearchDto: {
          personIds: selectedPersonId ? [selectedPersonId] : undefined,
          order: AssetOrder.Desc,
          size: 200,
          page: 1,
        },
      }),
    enabled: Boolean(selectedPersonId),
    staleTime: 30_000,
  })

  const personAssets = useMemo<TimelineAsset[]>(() => {
    const items = personAssetsQuery.data?.assets.items ?? []

    return items.map((asset) => ({
      id: asset.id,
      fileCreatedAt: asset.fileCreatedAt,
      isImage: asset.type === AssetTypeEnum.Image,
      isFavorite: asset.isFavorite,
      duration: asset.duration,
      thumbhash: asset.thumbhash,
    }))
  }, [personAssetsQuery.data?.assets.items])

  const updatePersonMutation = useMutation({
    mutationFn: ({ id, personUpdateDto }: Parameters<typeof updatePerson>[0]) =>
      updatePerson({ id, personUpdateDto }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['people'] }),
        queryClient.invalidateQueries({ queryKey: ['search'] }),
      ])
    },
  })

  const deletePersonMutation = useMutation({
    mutationFn: ({ id }: Parameters<typeof deletePerson>[0]) => deletePerson({ id }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['people'] }),
        queryClient.invalidateQueries({ queryKey: ['search'] }),
      ])
    },
  })

  const handleRename = async () => {
    if (!selectedPerson || !personNameDraft.trim()) {
      return
    }

    setStatusMessage(null)

    try {
      await updatePersonMutation.mutateAsync({
        id: selectedPerson.id,
        personUpdateDto: { name: personNameDraft.trim() },
      })
      setStatusMessage('Person name updated.')
    } catch {
      setStatusMessage('Failed to update person name.')
    }
  }

  const handleFavoriteToggle = async () => {
    if (!selectedPerson) {
      return
    }

    setStatusMessage(null)

    try {
      await updatePersonMutation.mutateAsync({
        id: selectedPerson.id,
        personUpdateDto: { isFavorite: !selectedPerson.isFavorite },
      })
      setStatusMessage('Person favorite status updated.')
    } catch {
      setStatusMessage('Failed to update favorite status.')
    }
  }

  const handleHiddenToggle = async () => {
    if (!selectedPerson) {
      return
    }

    setStatusMessage(null)

    try {
      await updatePersonMutation.mutateAsync({
        id: selectedPerson.id,
        personUpdateDto: { isHidden: !selectedPerson.isHidden },
      })
      setStatusMessage('Person visibility updated.')
    } catch {
      setStatusMessage('Failed to update visibility.')
    }
  }

  const handleDeletePerson = async () => {
    if (!selectedPerson) {
      return
    }

    const confirmed = window.confirm(`Delete person \"${selectedPerson.name}\"?`)
    if (!confirmed) {
      return
    }

    setStatusMessage(null)

    try {
      await deletePersonMutation.mutateAsync({ id: selectedPerson.id })
      setStatusMessage('Person deleted.')
    } catch {
      setStatusMessage('Failed to delete person.')
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col p-6">
      <AppHeader
        title="People"
        subtitle="Browse recognized people, update names, and view all assets for a selected person."
      />

      <section className="mt-6 grid gap-6 lg:grid-cols-[320px,1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3">
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Filter people"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="max-h-[calc(100vh-300px)] space-y-2 overflow-auto pr-1">
            {filteredPeople.map((person) => {
              const active = person.id === selectedPersonId
              return (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => setSelectedPersonId(person.id)}
                  className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left ${
                    active
                      ? 'border-cyan-300 bg-cyan-50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <img
                    src={toPersonThumbnailUrl(person.thumbnailPath)}
                    alt={person.name}
                    className="h-10 w-10 rounded-full bg-slate-100 object-cover"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{person.name}</p>
                    <p className="text-xs text-slate-600">{person.isFavorite ? 'Favorite' : 'Person'}</p>
                  </div>
                </button>
              )
            })}

            {!filteredPeople.length ? (
              <p className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-600">
                No people found.
              </p>
            ) : null}
          </div>
        </aside>

        <section>
          {!selectedPerson ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
              Select a person to view their assets.
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <img
                    src={toPersonThumbnailUrl(selectedPerson.thumbnailPath)}
                    alt={selectedPerson.name}
                    className="h-14 w-14 rounded-full bg-slate-100 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Name
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <input
                        value={personNameDraft}
                        onChange={(event) => setPersonNameDraft(event.target.value)}
                        className="min-w-56 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => void handleRename()}
                        className="rounded-lg bg-cyan-700 px-3 py-2 text-sm font-semibold text-white"
                      >
                        Save Name
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleFavoriteToggle()}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
                  >
                    {selectedPerson.isFavorite ? 'Unfavorite' : 'Favorite'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleHiddenToggle()}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
                  >
                    {selectedPerson.isHidden ? 'Unhide' : 'Hide'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeletePerson()}
                    className="rounded-lg border border-rose-200 px-3 py-2 text-sm text-rose-700"
                  >
                    Delete Person
                  </button>
                </div>
              </div>

              {personAssetsQuery.isLoading ? (
                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
                  Loading person assets...
                </div>
              ) : null}

              {personAssetsQuery.isError ? (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
                  Failed to load assets for this person.
                </div>
              ) : null}

              {!personAssetsQuery.isLoading && !personAssetsQuery.isError ? (
                <AssetGrid
                  assets={personAssets}
                  selectedIds={selectedIds}
                  onSelectionChange={setAllSelected}
                  onOpenAsset={setViewerIndex}
                  emptyMessage="No assets found for this person."
                />
              ) : null}
            </>
          )}
        </section>
      </section>

      {viewerIndex !== null ? (
        <AssetViewer assets={personAssets} initialIndex={viewerIndex} onClose={() => setViewerIndex(null)} />
      ) : null}

      {statusMessage ? (
        <p className="mt-4 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          {statusMessage}
        </p>
      ) : null}

      {selectedIds.size > 0 ? (
        <div className="mt-4 flex items-center justify-between rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-900">
          <span>{selectedIds.size} assets selected</span>
          <button type="button" onClick={clearSelected} className="rounded border border-cyan-300 bg-white px-2 py-1 text-xs">
            Clear Selection
          </button>
        </div>
      ) : null}
    </main>
  )
}
