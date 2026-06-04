import { useEffect, useState } from 'react'
import { finishOAuth } from '@immich/sdk'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

const OAUTH_STATE_KEY = 'immichext.oauth.state'
const OAUTH_VERIFIER_KEY = 'immichext.oauth.verifier'

export const OAuthCallbackPage = () => {
  const navigate = useNavigate()
  const setBearerSession = useAuthStore((state) => state.setBearerSession)
  const validateSession = useAuthStore((state) => state.validateSession)

  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const completeOAuth = async () => {
      const state = sessionStorage.getItem(OAUTH_STATE_KEY) ?? undefined
      const codeVerifier = sessionStorage.getItem(OAUTH_VERIFIER_KEY) ?? undefined

      try {
        const response = await finishOAuth({
          oAuthCallbackDto: {
            url: window.location.href,
            state,
            codeVerifier,
          },
        })

        setBearerSession(response.accessToken, {
          id: response.userId,
          email: response.userEmail,
          name: response.name,
        })

        sessionStorage.removeItem(OAUTH_STATE_KEY)
        sessionStorage.removeItem(OAUTH_VERIFIER_KEY)

        await validateSession()
        navigate('/', { replace: true })
      } catch {
        setError('OAuth sign-in failed. Try starting OAuth again from the login page.')
      }
    }

    void completeOAuth()
  }, [navigate, setBearerSession, validateSession])

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-900/5">
        <h1 className="text-xl font-semibold text-slate-900">OAuth Callback</h1>
        <p className="mt-2 text-sm text-slate-600">
          {error ?? 'Completing OAuth sign-in...'}
        </p>
        {error ? (
          <button
            type="button"
            onClick={() => navigate('/login', { replace: true })}
            className="mt-5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Back to Login
          </button>
        ) : null}
      </section>
    </main>
  )
}
