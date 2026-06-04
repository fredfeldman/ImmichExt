import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import {
  AssetOrder,
  AssetTypeEnum,
  getAllTags,
  getSearchSuggestions,
  searchAssets,
  searchPerson,
  searchSmart,
  SearchSuggestionType,
} from '@immich/sdk'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { AssetGrid } from '../components/AssetGrid'
import { AssetViewer } from '../components/AssetViewer'
import type { TimelineAsset } from '../components/AssetGrid'
import { useSelectionStore } from '../store/selection'

type SearchMode = 'smart' | 'metadata'

type PersonChip = {
  id: string
  name: string
}

const parseCsv = (value: string | null): string[] =>
  value ? value.split(',').map((item) => item.trim()).filter(Boolean) : []

export const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedIds = useSelectionStore((state) => state.selectedIds)
  const setAllSelected = useSelectionStore((state) => state.setAll)
  const clearSelected = useSelectionStore((state) => state.clear)

  const initialMode = (searchParams.get('mode') as SearchMode | null) ?? 'smart'
  const [mode, setMode] = useState<SearchMode>(initialMode)
  const [queryText, setQueryText] = useState(searchParams.get('q') ?? '')
  const [takenAfter, setTakenAfter] = useState(searchParams.get('takenAfter') ?? '')
  const [takenBefore, setTakenBefore] = useState(searchParams.get('takenBefore') ?? '')
  const [make, setMake] = useState(searchParams.get('make') ?? '')
  const [model, setModel] = useState(searchParams.get('model') ?? '')
  const [country, setCountry] = useState(searchParams.get('country') ?? '')
  const [stateValue, setStateValue] = useState(searchParams.get('state') ?? '')
  const [assetType, setAssetType] = useState(searchParams.get('type') ?? '')
  const [isFavoriteOnly, setIsFavoriteOnly] = useState(searchParams.get('favorite') === '1')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(() => parseCsv(searchParams.get('tagIds')))
  const [selectedPeople, setSelectedPeople] = useState<PersonChip[]>([])
  const [personQuery, setPersonQuery] = useState('')
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)

  const deferredPersonQuery = useDeferredValue(personQuery)

  useEffect(() => {
    setMode(((searchParams.get('mode') as SearchMode | null) ?? 'smart'))
    setQueryText(searchParams.get('q') ?? '')
    setTakenAfter(searchParams.get('takenAfter') ?? '')
    setTakenBefore(searchParams.get('takenBefore') ?? '')
    setMake(searchParams.get('make') ?? '')
    setModel(searchParams.get('model') ?? '')
    setCountry(searchParams.get('country') ?? '')
    setStateValue(searchParams.get('state') ?? '')
    setAssetType(searchParams.get('type') ?? '')
    setIsFavoriteOnly(searchParams.get('favorite') === '1')
    setSelectedTagIds(parseCsv(searchParams.get('tagIds')))
  }, [searchParams])

  useEffect(() => {
    clearSelected()
  }, [clearSelected, searchParams])

  const tagsQuery = useQuery({
    queryKey: ['tags', 'all'],
    queryFn: () => getAllTags(),
    staleTime: 60_000,
  })

  const peopleQuery = useQuery({
    queryKey: ['search', 'people', deferredPersonQuery],
    queryFn: () => searchPerson({ name: deferredPersonQuery, withHidden: false }),
    enabled: deferredPersonQuery.trim().length >= 2,
    staleTime: 30_000,
  })

  const makeSuggestionsQuery = useQuery({
    queryKey: ['search', 'suggestions', 'make'],
    queryFn: () => getSearchSuggestions({ $type: SearchSuggestionType.CameraMake }),
    staleTime: 300_000,
  })

  const modelSuggestionsQuery = useQuery({
    queryKey: ['search', 'suggestions', 'model', make],
    queryFn: () =>
      getSearchSuggestions({
        $type: SearchSuggestionType.CameraModel,
        make: make || undefined,
      }),
    staleTime: 300_000,
  })

  const countrySuggestionsQuery = useQuery({
    queryKey: ['search', 'suggestions', 'country'],
    queryFn: () => getSearchSuggestions({ $type: SearchSuggestionType.Country }),
    staleTime: 300_000,
  })

  const stateSuggestionsQuery = useQuery({
    queryKey: ['search', 'suggestions', 'state', country],
    queryFn: () =>
      getSearchSuggestions({
        $type: SearchSuggestionType.State,
        country: country || undefined,
      }),
    staleTime: 300_000,
  })

  const appliedPersonIds = useMemo(() => selectedPeople.map((person) => person.id), [selectedPeople])

  const searchPayload = useMemo(() => {
    const common = {
      takenAfter: takenAfter || undefined,
      takenBefore: takenBefore || undefined,
      make: make || undefined,
      model: model || undefined,
      country: country || undefined,
      state: stateValue || undefined,
      isFavorite: isFavoriteOnly || undefined,
      type: (assetType as AssetTypeEnum | '') || undefined,
      tagIds: selectedTagIds.length ? selectedTagIds : undefined,
      personIds: appliedPersonIds.length ? appliedPersonIds : undefined,
      order: AssetOrder.Desc,
      size: 200,
      page: 1,
    }

    return common
  }, [appliedPersonIds, assetType, country, isFavoriteOnly, make, model, selectedTagIds, stateValue, takenAfter, takenBefore])

  const smartSearchQuery = useQuery({
    queryKey: ['search', 'smart', queryText, searchPayload],
    queryFn: () => searchSmart({ smartSearchDto: { ...searchPayload, query: queryText || undefined } }),
    enabled: mode === 'smart' && (Boolean(queryText.trim()) || Boolean(Object.values(searchPayload).some(Boolean))),
    staleTime: 30_000,
  })

  const metadataSearchQuery = useQuery({
    queryKey: ['search', 'metadata', queryText, searchPayload],
    queryFn: () =>
      searchAssets({
        metadataSearchDto: {
          ...searchPayload,
          description: queryText || undefined,
          originalFileName: queryText || undefined,
          ocr: queryText || undefined,
        },
      }),
    enabled: mode === 'metadata' && (Boolean(queryText.trim()) || Boolean(Object.values(searchPayload).some(Boolean))),
    staleTime: 30_000,
  })

  const activeResult = mode === 'smart' ? smartSearchQuery.data : metadataSearchQuery.data
  const isLoading = mode === 'smart' ? smartSearchQuery.isLoading : metadataSearchQuery.isLoading
  const isError = mode === 'smart' ? smartSearchQuery.isError : metadataSearchQuery.isError

  const resultAssets = useMemo<TimelineAsset[]>(() => {
    const items = activeResult?.assets.items ?? []
    return items.map((asset) => ({
      id: asset.id,
      fileCreatedAt: asset.fileCreatedAt,
      isImage: asset.type === AssetTypeEnum.Image,
      isFavorite: asset.isFavorite,
      duration: asset.duration,
      thumbhash: asset.thumbhash,
    }))
  }, [activeResult])

  const handleSubmit = () => {
    const nextParams = new URLSearchParams()
    nextParams.set('mode', mode)

    if (queryText.trim()) nextParams.set('q', queryText.trim())
    if (takenAfter) nextParams.set('takenAfter', takenAfter)
    if (takenBefore) nextParams.set('takenBefore', takenBefore)
    if (make.trim()) nextParams.set('make', make.trim())
    if (model.trim()) nextParams.set('model', model.trim())
    if (country.trim()) nextParams.set('country', country.trim())
    if (stateValue.trim()) nextParams.set('state', stateValue.trim())
    if (assetType) nextParams.set('type', assetType)
    if (isFavoriteOnly) nextParams.set('favorite', '1')
    if (selectedTagIds.length) nextParams.set('tagIds', selectedTagIds.join(','))

    setSearchParams(nextParams)
  }

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((current) =>
      current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId],
    )
  }

  const addPerson = (person: PersonChip) => {
    setSelectedPeople((current) =>
      current.some((item) => item.id === person.id) ? current : [...current, person],
    )
    setPersonQuery('')
  }

  const removePerson = (personId: string) => {
    setSelectedPeople((current) => current.filter((person) => person.id !== personId))
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col p-6">
      <AppHeader
        title="Search"
        subtitle="Smart search, metadata filters, suggestions, and result browsing in one place."
      />

      <section className="mt-6 grid gap-6 lg:grid-cols-[360px,1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode('smart')}
              className={`rounded-lg px-3 py-2 text-sm ${mode === 'smart' ? 'bg-slate-900 text-white' : 'border border-slate-300 text-slate-700'}`}
            >
              Smart Search
            </button>
            <button
              type="button"
              onClick={() => setMode('metadata')}
              className={`rounded-lg px-3 py-2 text-sm ${mode === 'metadata' ? 'bg-slate-900 text-white' : 'border border-slate-300 text-slate-700'}`}
            >
              Metadata
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {mode === 'smart' ? 'Search query' : 'Text / OCR / file name'}
              </label>
              <input
                value={queryText}
                onChange={(event) => setQueryText(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder={mode === 'smart' ? 'beach sunset dog' : 'IMG_2024 or passport or dinner'}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Taken after</label>
                <input type="date" value={takenAfter} onChange={(event) => setTakenAfter(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Taken before</label>
                <input type="date" value={takenBefore} onChange={(event) => setTakenBefore(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Camera make</label>
                <input list="make-suggestions" value={make} onChange={(event) => setMake(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <datalist id="make-suggestions">
                  {(makeSuggestionsQuery.data ?? []).map((item) => <option key={item} value={item} />)}
                </datalist>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Camera model</label>
                <input list="model-suggestions" value={model} onChange={(event) => setModel(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <datalist id="model-suggestions">
                  {(modelSuggestionsQuery.data ?? []).map((item) => <option key={item} value={item} />)}
                </datalist>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Country</label>
                <input list="country-suggestions" value={country} onChange={(event) => setCountry(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <datalist id="country-suggestions">
                  {(countrySuggestionsQuery.data ?? []).map((item) => <option key={item} value={item} />)}
                </datalist>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">State</label>
                <input list="state-suggestions" value={stateValue} onChange={(event) => setStateValue(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <datalist id="state-suggestions">
                  {(stateSuggestionsQuery.data ?? []).map((item) => <option key={item} value={item} />)}
                </datalist>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Asset type</label>
                <select value={assetType} onChange={(event) => setAssetType(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="">Any</option>
                  <option value={AssetTypeEnum.Image}>Image</option>
                  <option value={AssetTypeEnum.Video}>Video</option>
                </select>
              </div>
              <label className="mt-7 flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={isFavoriteOnly} onChange={(event) => setIsFavoriteOnly(event.target.checked)} />
                Favorites only
              </label>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">People</label>
              <input value={personQuery} onChange={(event) => setPersonQuery(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Search people names" />
              {selectedPeople.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedPeople.map((person) => (
                    <button key={person.id} type="button" onClick={() => removePerson(person.id)} className="rounded-full border border-slate-300 px-2 py-1 text-xs text-slate-700">
                      {person.name} x
                    </button>
                  ))}
                </div>
              ) : null}
              {peopleQuery.data?.length ? (
                <div className="mt-2 max-h-36 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
                  {peopleQuery.data.slice(0, 8).map((person) => (
                    <button key={person.id} type="button" onClick={() => addPerson({ id: person.id, name: person.name })} className="block w-full rounded px-2 py-1 text-left text-sm text-slate-700 hover:bg-white">
                      {person.name}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Tags</label>
              <div className="max-h-40 overflow-auto rounded-lg border border-slate-200 p-2">
                <div className="grid gap-2">
                  {(tagsQuery.data ?? []).map((tag) => (
                    <label key={tag.id} className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" checked={selectedTagIds.includes(tag.id)} onChange={() => toggleTag(tag.id)} />
                      <span>{tag.value || tag.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={handleSubmit} className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white">
                Run Search
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('smart')
                  setQueryText('')
                  setTakenAfter('')
                  setTakenBefore('')
                  setMake('')
                  setModel('')
                  setCountry('')
                  setStateValue('')
                  setAssetType('')
                  setIsFavoriteOnly(false)
                  setSelectedTagIds([])
                  setSelectedPeople([])
                  setSearchParams(new URLSearchParams())
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700"
              >
                Reset
              </button>
            </div>
          </div>
        </aside>

        <section>
          {isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
              Searching assets...
            </div>
          ) : null}

          {isError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
              Search failed. Check server features and query parameters.
            </div>
          ) : null}

          {activeResult ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  Found {activeResult.assets.total} asset matches and {activeResult.albums.total} related albums.
                </div>
                <div>{selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Double-click a result to open viewer'}</div>
              </div>
            </div>
          ) : null}

          {!isLoading && !isError ? (
            <AssetGrid
              assets={resultAssets}
              selectedIds={selectedIds}
              onSelectionChange={setAllSelected}
              onOpenAsset={setViewerIndex}
              emptyMessage="No assets matched the current search."
            />
          ) : null}
        </section>
      </section>

      {viewerIndex !== null ? (
        <AssetViewer
          assets={resultAssets}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      ) : null}
    </main>
  )
}
