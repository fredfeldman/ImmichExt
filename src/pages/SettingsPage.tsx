import { useEffect, useState } from 'react'
import { getAboutInfo, getMyPreferences, getMyUser, updateMyPreferences } from '@immich/sdk'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppHeader } from '../components/AppHeader'

export const SettingsPage = () => {
  const queryClient = useQueryClient()
  const [memoriesEnabled, setMemoriesEnabled] = useState(true)
  const [memoriesDuration, setMemoriesDuration] = useState(7_200)
  const [peopleEnabled, setPeopleEnabled] = useState(true)
  const [tagsEnabled, setTagsEnabled] = useState(true)
  const [sharedLinksEnabled, setSharedLinksEnabled] = useState(true)
  const [ratingsEnabled, setRatingsEnabled] = useState(true)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const userQuery = useQuery({
    queryKey: ['settings', 'me'],
    queryFn: () => getMyUser(),
    staleTime: 60_000,
  })

  const prefsQuery = useQuery({
    queryKey: ['settings', 'preferences'],
    queryFn: () => getMyPreferences(),
    staleTime: 60_000,
  })

  const aboutQuery = useQuery({
    queryKey: ['settings', 'about'],
    queryFn: () => getAboutInfo(),
    staleTime: 300_000,
  })

  useEffect(() => {
    if (!prefsQuery.data) {
      return
    }

    setMemoriesEnabled(prefsQuery.data.memories.enabled)
    setMemoriesDuration(prefsQuery.data.memories.duration)
    setPeopleEnabled(prefsQuery.data.people.enabled)
    setTagsEnabled(prefsQuery.data.tags.enabled)
    setSharedLinksEnabled(prefsQuery.data.sharedLinks.enabled)
    setRatingsEnabled(prefsQuery.data.ratings.enabled)
  }, [prefsQuery.data])

  const updatePrefsMutation = useMutation({
    mutationFn: ({ userPreferencesUpdateDto }: Parameters<typeof updateMyPreferences>[0]) =>
      updateMyPreferences({ userPreferencesUpdateDto }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['settings', 'preferences'] })
    },
  })

  const handleSave = async () => {
    setStatusMessage(null)

    try {
      await updatePrefsMutation.mutateAsync({
        userPreferencesUpdateDto: {
          memories: {
            enabled: memoriesEnabled,
            duration: Number(memoriesDuration),
          },
          people: {
            enabled: peopleEnabled,
          },
          tags: {
            enabled: tagsEnabled,
          },
          sharedLinks: {
            enabled: sharedLinksEnabled,
          },
          ratings: {
            enabled: ratingsEnabled,
          },
        },
      })

      setStatusMessage('Preferences saved.')
    } catch {
      setStatusMessage('Failed to save preferences.')
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col p-4 sm:p-6">
      <AppHeader title="Settings" subtitle="Profile info, server details, and preference toggles." />

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-base font-semibold text-slate-900">Profile</h2>
          {userQuery.isLoading ? <p className="mt-3 text-sm text-slate-600">Loading profile...</p> : null}
          {userQuery.data ? (
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-xs uppercase text-slate-500">Name</dt>
                <dd className="text-slate-800">{userQuery.data.name}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-slate-500">Email</dt>
                <dd className="text-slate-800">{userQuery.data.email}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-slate-500">Storage Label</dt>
                <dd className="text-slate-800">{userQuery.data.storageLabel ?? 'Default'}</dd>
              </div>
            </dl>
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-base font-semibold text-slate-900">Server Info</h2>
          {aboutQuery.isLoading ? <p className="mt-3 text-sm text-slate-600">Loading server info...</p> : null}
          {aboutQuery.data ? (
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-xs uppercase text-slate-500">Version</dt>
                <dd className="text-slate-800">{aboutQuery.data.version}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-slate-500">Build</dt>
                <dd className="text-slate-800">{aboutQuery.data.build ?? 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-slate-500">Source</dt>
                <dd className="text-slate-800">{aboutQuery.data.sourceRef ?? aboutQuery.data.repository ?? 'N/A'}</dd>
              </div>
            </dl>
          ) : null}
        </section>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-slate-900">Preferences</h2>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={memoriesEnabled} onChange={(event) => setMemoriesEnabled(event.target.checked)} />
            Enable memories
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={peopleEnabled} onChange={(event) => setPeopleEnabled(event.target.checked)} />
            Enable people
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={tagsEnabled} onChange={(event) => setTagsEnabled(event.target.checked)} />
            Enable tags
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={sharedLinksEnabled} onChange={(event) => setSharedLinksEnabled(event.target.checked)} />
            Enable shared links
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={ratingsEnabled} onChange={(event) => setRatingsEnabled(event.target.checked)} />
            Enable ratings
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <span>Memory duration (sec)</span>
            <input
              type="number"
              min={0}
              value={memoriesDuration}
              onChange={(event) => setMemoriesDuration(Number(event.target.value))}
              className="w-28 rounded border border-slate-300 px-2 py-1"
            />
          </label>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => void handleSave()}
            className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white"
          >
            Save Preferences
          </button>
        </div>
      </section>

      {statusMessage ? (
        <p className="mt-4 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          {statusMessage}
        </p>
      ) : null}
    </main>
  )
}
