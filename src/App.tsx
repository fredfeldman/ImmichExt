import { useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ShortcutsOverlay } from './components/ShortcutsOverlay'
import { useKeyboard } from './hooks/useKeyboard'
import { AlbumDetailPage } from './pages/AlbumDetailPage'
import { AlbumsPage } from './pages/AlbumsPage'
import { DuplicatesPage } from './pages/DuplicatesPage'
import { LoginPage } from './pages/LoginPage'
import { MemoriesPage } from './pages/MemoriesPage'
import { OAuthCallbackPage } from './pages/OAuthCallbackPage'
import { PeoplePage } from './pages/PeoplePage'
import { PartnersPage } from './pages/PartnersPage'
import { SearchPage } from './pages/SearchPage'
import { SharingPage } from './pages/SharingPage'
import { SettingsPage } from './pages/SettingsPage'
import { TagsPage } from './pages/TagsPage'
import { TimelinePage } from './pages/TimelinePage'
import { TrashPage } from './pages/TrashPage'
import { useAuthStore } from './store/auth'

function App() {
  const token = useAuthStore((state) => state.token)
  const apiKey = useAuthStore((state) => state.apiKey)
  const authChecked = useAuthStore((state) => state.authChecked)
  const validateSession = useAuthStore((state) => state.validateSession)
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false)

  const shortcuts = useMemo(
    () => [
      { keys: '?', action: 'Show shortcuts overlay' },
      { keys: 'Left / Right', action: 'Previous / next asset in viewer' },
      { keys: 'F', action: 'Toggle favorite (viewer)' },
      { keys: 'A', action: 'Toggle archive (viewer)' },
      { keys: 'Delete', action: 'Move asset to trash (viewer)' },
      { keys: 'C', action: 'Open/focus comment panel (viewer)' },
      { keys: 'S', action: 'Create + copy share link (viewer)' },
      { keys: '0-5', action: 'Set star rating (viewer)' },
      { keys: 'Ctrl/Cmd+A', action: 'Select all visible assets' },
      { keys: 'Esc', action: 'Close viewer or clear selection' },
    ],
    [],
  )

  useKeyboard(
    [
      {
        key: '?',
        shift: true,
        handler: () => {
          setIsShortcutsOpen((value) => !value)
        },
      },
      {
        key: 'Escape',
        handler: () => {
          setIsShortcutsOpen(false)
        },
      },
    ],
    { enabled: authChecked },
  )

  useEffect(() => {
    void validateSession()
  }, [validateSession])

  if (!authChecked) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 text-slate-700">
        Validating session...
      </main>
    )
  }

  const hasSession = Boolean(token || apiKey)

  return (
    <>
      <Routes>
        <Route
          path="/login"
          element={hasSession ? <Navigate to="/" replace /> : <LoginPage />}
        />
        <Route path="/auth/callback" element={<OAuthCallbackPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<TimelinePage />} />
          <Route path="/albums" element={<AlbumsPage />} />
          <Route path="/albums/:albumId" element={<AlbumDetailPage />} />
          <Route path="/people" element={<PeoplePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/sharing" element={<SharingPage />} />
          <Route path="/sharing/partners" element={<PartnersPage />} />
          <Route path="/tags" element={<TagsPage />} />
          <Route path="/trash" element={<TrashPage />} />
          <Route path="/memories" element={<MemoriesPage />} />
          <Route path="/duplicates" element={<DuplicatesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to={hasSession ? '/' : '/login'} replace />} />
      </Routes>

      <ShortcutsOverlay
        open={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
        shortcuts={shortcuts}
      />
    </>
  )
}

export default App
