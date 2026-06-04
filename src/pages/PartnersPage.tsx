import { useMemo, useState } from 'react'
import {
  createPartner,
  getPartners,
  PartnerDirection,
  removePartner,
  searchUsers,
  updatePartner,
} from '@immich/sdk'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { useAuthStore } from '../store/auth'

export const PartnersPage = () => {
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((state) => state.user)
  const [sharedWithId, setSharedWithId] = useState('')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const sharedByQuery = useQuery({
    queryKey: ['partners', PartnerDirection.SharedBy],
    queryFn: () => getPartners({ direction: PartnerDirection.SharedBy }),
    staleTime: 30_000,
  })

  const sharedWithQuery = useQuery({
    queryKey: ['partners', PartnerDirection.SharedWith],
    queryFn: () => getPartners({ direction: PartnerDirection.SharedWith }),
    staleTime: 30_000,
  })

  const usersQuery = useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => searchUsers(),
    staleTime: 60_000,
  })

  const createPartnerMutation = useMutation({
    mutationFn: ({ partnerCreateDto }: Parameters<typeof createPartner>[0]) =>
      createPartner({ partnerCreateDto }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['partners'] })
    },
  })

  const removePartnerMutation = useMutation({
    mutationFn: ({ id }: Parameters<typeof removePartner>[0]) => removePartner({ id }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['partners'] })
    },
  })

  const updatePartnerMutation = useMutation({
    mutationFn: ({ id, partnerUpdateDto }: Parameters<typeof updatePartner>[0]) =>
      updatePartner({ id, partnerUpdateDto }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['partners'] })
    },
  })

  const candidateUsers = useMemo(
    () => (usersQuery.data ?? []).filter((user) => user.id !== currentUser?.id),
    [currentUser?.id, usersQuery.data],
  )

  const handleCreatePartner = async () => {
    if (!sharedWithId) {
      setStatusMessage('Select a user to share with.')
      return
    }

    setStatusMessage(null)

    try {
      await createPartnerMutation.mutateAsync({
        partnerCreateDto: { sharedWithId },
      })
      setSharedWithId('')
      setStatusMessage('Partner sharing created.')
    } catch {
      setStatusMessage('Failed to create partner sharing.')
    }
  }

  const handleRemovePartner = async (id: string) => {
    const confirmed = window.confirm('Remove this partner relationship?')
    if (!confirmed) {
      return
    }

    setStatusMessage(null)

    try {
      await removePartnerMutation.mutateAsync({ id })
      setStatusMessage('Partner removed.')
    } catch {
      setStatusMessage('Failed to remove partner.')
    }
  }

  const handleToggleTimeline = async (id: string, inTimeline: boolean) => {
    setStatusMessage(null)

    try {
      await updatePartnerMutation.mutateAsync({
        id,
        partnerUpdateDto: { inTimeline: !inTimeline },
      })
      setStatusMessage('Partner timeline visibility updated.')
    } catch {
      setStatusMessage('Failed to update partner visibility.')
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col p-6">
      <AppHeader
        title="Partners"
        subtitle="Manage partner sharing relationships and whether partner assets appear in your timeline."
        actions={
          <Link to="/sharing" className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700">
            Shared Links
          </Link>
        }
      />

      <section className="mt-6 grid gap-6 lg:grid-cols-[360px,1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-base font-semibold text-slate-900">Add Partner</h2>
          <div className="mt-3 space-y-3">
            <select
              value={sharedWithId}
              onChange={(event) => setSharedWithId(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Select user</option>
              {candidateUsers.map((user) => (
                <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void handleCreatePartner()}
              disabled={!sharedWithId || createPartnerMutation.isPending}
              className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Create Partner Share
            </button>
          </div>
        </aside>

        <section className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-base font-semibold text-slate-900">Shared By You</h2>
            <div className="mt-4 space-y-3">
              {(sharedByQuery.data ?? []).map((partner) => (
                <article key={partner.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">{partner.name}</h3>
                      <p className="text-sm text-slate-600">{partner.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void handleToggleTimeline(partner.id, Boolean(partner.inTimeline))}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
                      >
                        {partner.inTimeline ? 'Hide from Timeline' : 'Show in Timeline'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleRemovePartner(partner.id)}
                        className="rounded-lg border border-rose-200 px-3 py-2 text-sm text-rose-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              ))}
              {sharedByQuery.data?.length === 0 ? <p className="text-sm text-slate-600">No outgoing partner shares yet.</p> : null}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-base font-semibold text-slate-900">Shared With You</h2>
            <div className="mt-4 space-y-3">
              {(sharedWithQuery.data ?? []).map((partner) => (
                <article key={partner.id} className="rounded-xl border border-slate-200 p-4">
                  <div>
                    <h3 className="font-semibold text-slate-900">{partner.name}</h3>
                    <p className="text-sm text-slate-600">{partner.email}</p>
                  </div>
                </article>
              ))}
              {sharedWithQuery.data?.length === 0 ? <p className="text-sm text-slate-600">No incoming partner shares yet.</p> : null}
            </div>
          </section>
        </section>
      </section>

      {statusMessage ? <p className="mt-4 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">{statusMessage}</p> : null}
    </main>
  )
}
