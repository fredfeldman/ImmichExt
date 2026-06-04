import { create } from 'zustand'

type SelectionState = {
  selectedIds: Set<string>
  add: (id: string) => void
  remove: (id: string) => void
  toggle: (id: string) => void
  setAll: (ids: string[]) => void
  clear: () => void
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedIds: new Set<string>(),
  add: (id) =>
    set((state) => {
      const next = new Set(state.selectedIds)
      next.add(id)
      return { selectedIds: next }
    }),
  remove: (id) =>
    set((state) => {
      const next = new Set(state.selectedIds)
      next.delete(id)
      return { selectedIds: next }
    }),
  toggle: (id) =>
    set((state) => {
      const next = new Set(state.selectedIds)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return { selectedIds: next }
    }),
  setAll: (ids) => set({ selectedIds: new Set(ids) }),
  clear: () => set({ selectedIds: new Set<string>() }),
}))
