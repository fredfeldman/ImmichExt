import { create } from 'zustand'
import {
  getMyUser,
  getAuthStatus,
  lockAuthSession,
  logout,
  unlockAuthSession,
  validateAccessToken,
} from '@immich/sdk'

export type AuthMode = 'bearer' | 'apiKey'

type AuthUser = {
  id: string
  email: string
  name: string
}

type AuthState = {
  mode: AuthMode | null
  token: string | null
  apiKey: string | null
  user: AuthUser | null
  authChecked: boolean
  isSessionLocked: boolean
  setBearerSession: (token: string, user: AuthUser | null) => void
  setApiKeySession: (apiKey: string, user: AuthUser | null) => void
  validateSession: () => Promise<boolean>
  logoutSession: () => Promise<void>
  lockSession: () => Promise<void>
  unlockSession: (unlockInput: { pinCode?: string; password?: string }) => Promise<void>
  clearSession: () => void
}

const AUTH_STORAGE_KEY = 'immichext.auth'

const loadPersistedAuth = (): Pick<AuthState, 'mode' | 'token' | 'apiKey' | 'user'> => {
  const fallback = { mode: null, token: null, apiKey: null, user: null }

  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) {
      return fallback
    }

    const parsed = JSON.parse(raw) as {
      mode?: AuthMode
      token?: string
      apiKey?: string
      user?: AuthUser
    }

    const mode =
      parsed.mode === 'bearer' || parsed.mode === 'apiKey' ? parsed.mode : null

    return {
      mode,
      token: parsed.token ?? null,
      apiKey: parsed.apiKey ?? null,
      user: parsed.user ?? null,
    }
  } catch {
    return fallback
  }
}

const persistAuth = ({
  mode,
  token,
  apiKey,
  user,
}: {
  mode: AuthMode | null
  token: string | null
  apiKey: string | null
  user: AuthUser | null
}): void => {
  if (!mode || (!token && !apiKey)) {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    return
  }

  localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({ mode, token, apiKey, user }),
  )
}

const mapUser = (user: { id: string; email: string; name: string }): AuthUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
})

const initialAuth = loadPersistedAuth()

export const useAuthStore = create<AuthState>((set, get) => ({
  mode: initialAuth.mode,
  token: initialAuth.token,
  apiKey: initialAuth.apiKey,
  user: initialAuth.user,
  authChecked: false,
  isSessionLocked: false,
  setBearerSession: (token, user) => {
    persistAuth({ mode: 'bearer', token, apiKey: null, user })
    set({ mode: 'bearer', token, apiKey: null, user })
  },
  setApiKeySession: (apiKey, user) => {
    persistAuth({ mode: 'apiKey', token: null, apiKey, user })
    set({ mode: 'apiKey', token: null, apiKey, user })
  },
  validateSession: async () => {
    const { mode, token, apiKey } = get()

    if (!mode || (!token && !apiKey)) {
      set({ authChecked: true })
      return false
    }

    try {
      if (mode === 'bearer') {
        try {
          const validation = await validateAccessToken()
          if (!validation.authStatus) {
            get().clearSession()
            set({ authChecked: true })
            return false
          }
        } catch {
          // Some Immich versions may not expose this endpoint. Continue with user fetch.
        }
      }

      const user = await getMyUser()
      let isSessionLocked = false

      try {
        const authStatus = await getAuthStatus()
        isSessionLocked = Boolean(authStatus.pinCode && !authStatus.isElevated)
      } catch {
        // Treat auth status as optional for compatibility across server versions.
      }

      const nextUser = mapUser(user)
      persistAuth({ mode, token, apiKey, user: nextUser })
      set({
        user: nextUser,
        authChecked: true,
        isSessionLocked,
      })

      return true
    } catch {
      get().clearSession()
      set({ authChecked: true })
      return false
    }
  },
  logoutSession: async () => {
    const { mode } = get()

    try {
      if (mode === 'bearer') {
        await logout()
      }
    } finally {
      get().clearSession()
    }
  },
  lockSession: async () => {
    await lockAuthSession()
    set({ isSessionLocked: true })
  },
  unlockSession: async ({ pinCode, password }) => {
    await unlockAuthSession({
      sessionUnlockDto: {
        pinCode: pinCode?.trim() || undefined,
        password: password?.trim() || undefined,
      },
    })
    set({ isSessionLocked: false })
  },
  clearSession: () => {
    persistAuth({ mode: null, token: null, apiKey: null, user: null })
    set({
      mode: null,
      token: null,
      apiKey: null,
      user: null,
      isSessionLocked: false,
    })
  },
}))
