import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { login, startOAuth } from '@immich/sdk'
import { Eye, EyeOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

const toErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message.trim()) {
    return `${fallback} (${error.message})`
  }

  return fallback
}

type AuthTab = 'password' | 'apiKey'

const OAUTH_STATE_KEY = 'immichext.oauth.state'
const OAUTH_VERIFIER_KEY = 'immichext.oauth.verifier'

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const randomToken = (length = 48): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)

  return Array.from(bytes, (byte) => chars[byte % chars.length]).join('')
}

const createPkceChallenge = async (verifier: string): Promise<string> => {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(verifier),
  )

  return toBase64Url(new Uint8Array(digest))
}

export const LoginPage = () => {
  const navigate = useNavigate()
  const setBearerSession = useAuthStore((state) => state.setBearerSession)
  const setApiKeySession = useAuthStore((state) => state.setApiKeySession)
  const validateSession = useAuthStore((state) => state.validateSession)
  const isSessionLocked = useAuthStore((state) => state.isSessionLocked)
  const unlockSession = useAuthStore((state) => state.unlockSession)

  const [tab, setTab] = useState<AuthTab>('password')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [apiKey, setApiKey] = useState('')

  const [unlockInput, setUnlockInput] = useState('')

  const title = useMemo(
    () => (isSessionLocked ? 'Session Locked' : 'Sign in to ImmichExt'),
    [isSessionLocked],
  )

  const handlePasswordLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const response = await login({
        loginCredentialDto: {
          email: email.trim(),
          password,
        },
      })

      setBearerSession(response.accessToken, {
        id: response.userId,
        email: response.userEmail,
        name: response.name,
      })

      await validateSession()
      navigate('/', { replace: true })
    } catch (error) {
      setError(
        toErrorMessage(
          error,
          'Login failed. Credentials may be correct, but a follow-up API check failed.',
        ),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleApiKeyLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      setApiKeySession(apiKey.trim(), null)
      const valid = await validateSession()

      if (!valid) {
        setError('API key is invalid or does not have enough permissions.')
        return
      }

      navigate('/', { replace: true })
    } catch {
      setError('Unable to validate API key.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOAuthStart = async () => {
    setError(null)
    setIsSubmitting(true)

    try {
      const state = randomToken(32)
      const verifier = randomToken(64)
      const redirectUri = `${window.location.origin}/auth/callback`
      const codeChallenge = await createPkceChallenge(verifier)

      sessionStorage.setItem(OAUTH_STATE_KEY, state)
      sessionStorage.setItem(OAUTH_VERIFIER_KEY, verifier)

      const oauth = await startOAuth({
        oAuthConfigDto: {
          redirectUri,
          state,
          codeChallenge,
        },
      })

      window.location.assign(oauth.url)
    } catch {
      setError('OAuth startup failed. Confirm OAuth is enabled on your Immich server.')
      setIsSubmitting(false)
    }
  }

  const handleUnlock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const value = unlockInput.trim()
      const looksLikePin = /^\d{4,6}$/.test(value)

      await unlockSession({
        pinCode: looksLikePin ? value : undefined,
        password: looksLikePin ? undefined : value,
      })

      navigate('/', { replace: true })
    } catch {
      setError('Unlock failed. Enter your PIN or password and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center p-6">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-900/5">
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {isSessionLocked
            ? 'Your Immich session is locked. Unlock to continue.'
            : 'Authenticate with your Immich account, API key, or OAuth.'}
        </p>

        {isSessionLocked ? (
          <form className="mt-6 space-y-4" onSubmit={handleUnlock}>
            <div>
              <label htmlFor="unlock-input" className="mb-1 block text-sm font-medium text-slate-700">
                PIN or Password
              </label>
              <input
                id="unlock-input"
                value={unlockInput}
                onChange={(event) => setUnlockInput(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-600"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isSubmitting ? 'Unlocking...' : 'Unlock Session'}
            </button>
          </form>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm">
              <button
                type="button"
                onClick={() => setTab('password')}
                className={`rounded-md px-3 py-2 font-medium ${
                  tab === 'password' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                Email Login
              </button>
              <button
                type="button"
                onClick={() => setTab('apiKey')}
                className={`rounded-md px-3 py-2 font-medium ${
                  tab === 'apiKey' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                API Key
              </button>
            </div>

            {tab === 'password' ? (
              <form className="mt-5 space-y-4" onSubmit={handlePasswordLogin}>
                <div>
                  <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-600"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm text-slate-900 outline-none focus:border-cyan-600"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-700"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {isSubmitting ? 'Signing in...' : 'Sign in'}
                </button>
              </form>
            ) : (
              <form className="mt-5 space-y-4" onSubmit={handleApiKeyLogin}>
                <div>
                  <label htmlFor="api-key" className="mb-1 block text-sm font-medium text-slate-700">
                    API Key
                  </label>
                  <input
                    id="api-key"
                    type="password"
                    autoComplete="off"
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-600"
                    placeholder="imp_..."
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {isSubmitting ? 'Validating...' : 'Use API key'}
                </button>
              </form>
            )}

            <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
              <div className="h-px flex-1 bg-slate-200"></div>
              <span>OR</span>
              <div className="h-px flex-1 bg-slate-200"></div>
            </div>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleOAuthStart}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Continue with OAuth
            </button>
          </>
        )}

        {error ? (
          <p className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
      </section>
    </main>
  )
}
