import { init } from '@immich/sdk'

const DEFAULT_BASE_URL =
  import.meta.env.VITE_IMMICH_API_URL?.trim() || '/api'

export type SessionAuth = {
  token: string | null
  apiKey: string | null
}

const normalizeBaseUrl = (baseUrl: string): string => {
  const trimmed = baseUrl.trim().replace(/\/$/, '')
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`
}

export const getApiBaseUrl = (): string => normalizeBaseUrl(DEFAULT_BASE_URL)

export const getImmichBaseUrl = (): string => getApiBaseUrl().replace(/\/api$/, '')

export const getAssetThumbnailUrl = (id: string, size: 'thumbnail' | 'preview' = 'preview'): string => {
  const apiBase = getApiBaseUrl()
  return `${apiBase}/assets/${id}/thumbnail?size=${size}`
}

export const getAssetOriginalUrl = (id: string): string => {
  const apiBase = getApiBaseUrl()
  return `${apiBase}/assets/${id}/original`
}

export const getAssetVideoPlaybackUrl = (id: string): string => {
  const apiBase = getApiBaseUrl()
  return `${apiBase}/assets/${id}/video/playback`
}

export const getSharedLinkUrl = (id: string): string => `${getImmichBaseUrl()}/share/${id}`

export const initializeApiClient = (token: string | null): void => {
  const baseUrl = normalizeBaseUrl(DEFAULT_BASE_URL)

  // Re-run init so switching between bearer and API key updates SDK defaults.
  init({
    baseUrl,
    apiKey: '',
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
    },
  })
}

export const initializeApiClientWithAuth = ({ token, apiKey }: SessionAuth): void => {
  const baseUrl = normalizeBaseUrl(DEFAULT_BASE_URL)

  init({
    baseUrl,
    apiKey: apiKey ?? '',
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
    },
  })
}
