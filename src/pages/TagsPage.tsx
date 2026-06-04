import { useMemo, useState } from 'react'
import { bulkTagAssets, createTag, deleteTag, getAllTags, untagAssets, updateTag } from '@immich/sdk'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppHeader } from '../components/AppHeader'
import { useSelectionStore } from '../store/selection'

const withHexFallback = (value: string | undefined): string => {
  if (!value) {
    return '#64748b'
  }

  return value.startsWith('#') ? value : `#${value}`
}

export const TagsPage = () => {
  const queryClient = useQueryClient()
  const selectedIds = useSelectionStore((state) => state.selectedIds)
  const clearSelected = useSelectionStore((state) => state.clear)

  const [newTagName, setNewTagName] = useState('')
  const [filterText, setFilterText] = useState('')
  const [activeTagId, setActiveTagId] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const tagsQuery = useQuery({
    queryKey: ['tags', 'all'],
    queryFn: () => getAllTags(),
    staleTime: 60_000,
  })

  const createTagMutation = useMutation({
    mutationFn: ({ tagCreateDto }: Parameters<typeof createTag>[0]) => createTag({ tagCreateDto }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tags'] })
    },
  })

  const updateTagMutation = useMutation({
    mutationFn: ({ id, tagUpdateDto }: Parameters<typeof updateTag>[0]) => updateTag({ id, tagUpdateDto }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tags'] })
    },
  })

  const deleteTagMutation = useMutation({
    mutationFn: ({ id }: Parameters<typeof deleteTag>[0]) => deleteTag({ id }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tags'] })
    },
  })

  const tagAssetsMutation = useMutation({
    mutationFn: ({ tagBulkAssetsDto }: Parameters<typeof bulkTagAssets>[0]) =>
      bulkTagAssets({ tagBulkAssetsDto }),
  })

  const untagAssetsMutation = useMutation({
    mutationFn: ({ id, bulkIdsDto }: Parameters<typeof untagAssets>[0]) => untagAssets({ id, bulkIdsDto }),
  })

  const tags = useMemo(() => {
    const query = filterText.trim().toLowerCase()
    const items = [...(tagsQuery.data ?? [])].sort((left, right) => left.value.localeCompare(right.value))

    if (!query) {
      return items
    }

    return items.filter((tag) => tag.value.toLowerCase().includes(query) || tag.name.toLowerCase().includes(query))
  }, [filterText, tagsQuery.data])

  const selectedIdList = useMemo(() => Array.from(selectedIds), [selectedIds])

  const runAction = async (label: string, action: () => Promise<void>) => {
    setStatusMessage(null)

    try {
      await action()
      setStatusMessage(`${label} completed.`)
    } catch {
      setStatusMessage(`${label} failed.`)
    }
  }

  const handleCreateTag = async () => {
    const value = newTagName.trim()
    if (!value) {
      return
    }

    await runAction('Create tag', async () => {
      const created = await createTagMutation.mutateAsync({
        tagCreateDto: { name: value },
      })
      setNewTagName('')
      setActiveTagId(created.id)
    })
  }

  const handleDeleteTag = async (id: string, name: string) => {
    const confirmed = window.confirm(`Delete tag \"${name}\"?`)
    if (!confirmed) {
      return
    }

    await runAction('Delete tag', async () => {
      await deleteTagMutation.mutateAsync({ id })
      if (activeTagId === id) {
        setActiveTagId(null)
      }
    })
  }

  const handleUpdateColor = async (id: string, color: string) => {
    await runAction('Update tag color', async () => {
      await updateTagMutation.mutateAsync({
        id,
        tagUpdateDto: { color },
      })
    })
  }

  const handleApplyToSelection = async () => {
    if (!activeTagId || !selectedIdList.length) {
      return
    }

    await runAction('Apply tag to selection', async () => {
      await tagAssetsMutation.mutateAsync({
        tagBulkAssetsDto: {
          assetIds: selectedIdList,
          tagIds: [activeTagId],
        },
      })
    })
  }

  const handleRemoveFromSelection = async () => {
    if (!activeTagId || !selectedIdList.length) {
      return
    }

    await runAction('Remove tag from selection', async () => {
      await untagAssetsMutation.mutateAsync({
        id: activeTagId,
        bulkIdsDto: { ids: selectedIdList },
      })
    })
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col p-6">
      <AppHeader
        title="Tags"
        subtitle="Browse and manage tags, then apply or remove a tag from the currently selected assets."
      />

      <section className="mt-6 grid gap-6 lg:grid-cols-[320px,1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-base font-semibold text-slate-900">Create Tag</h2>
          <div className="mt-3 flex gap-2">
            <input
              value={newTagName}
              onChange={(event) => setNewTagName(event.target.value)}
              placeholder="New tag name"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => void handleCreateTag()}
              className="rounded-lg bg-cyan-700 px-3 py-2 text-sm font-semibold text-white"
            >
              Create
            </button>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-900">Selection Actions</h3>
            <p className="mt-1 text-sm text-slate-600">{selectedIdList.length} assets selected</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleApplyToSelection()}
                disabled={!activeTagId || !selectedIdList.length}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:opacity-60"
              >
                Apply Active Tag
              </button>
              <button
                type="button"
                onClick={() => void handleRemoveFromSelection()}
                disabled={!activeTagId || !selectedIdList.length}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:opacity-60"
              >
                Remove Active Tag
              </button>
              <button
                type="button"
                onClick={clearSelected}
                disabled={!selectedIdList.length}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:opacity-60"
              >
                Clear Selection
              </button>
            </div>
          </div>

          <p className="mt-6 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Tag renaming is not available in this Immich SDK version. Color editing is supported.
          </p>
        </aside>

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-4">
            <input
              value={filterText}
              onChange={(event) => setFilterText(event.target.value)}
              placeholder="Filter tags"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-3">
            {tags.map((tag) => {
              const active = activeTagId === tag.id

              return (
                <article
                  key={tag.id}
                  className={`rounded-xl border p-3 ${active ? 'border-cyan-300 bg-cyan-50' : 'border-slate-200'}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTagId(tag.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-sm font-semibold text-slate-900">{tag.name}</p>
                      <p className="truncate text-xs text-slate-600">{tag.value}</p>
                    </button>

                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={withHexFallback(tag.color)}
                        onChange={(event) => void handleUpdateColor(tag.id, event.target.value)}
                        className="h-8 w-10 cursor-pointer rounded border border-slate-300 bg-white p-1"
                      />
                      <button
                        type="button"
                        onClick={() => void handleDeleteTag(tag.id, tag.name)}
                        className="rounded-lg border border-rose-200 px-3 py-2 text-xs text-rose-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}

            {!tags.length ? (
              <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                No tags found.
              </p>
            ) : null}
          </div>
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
