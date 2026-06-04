# Devloper Guide: ImmichExt

## 1. Purpose

ImmichExt is an alternative React frontend for Immich, optimized for fast daily workflows and keyboard-heavy usage.

This guide is for developers who want to:

- Run the app locally
- Connect to a remote Immich server
- Understand project architecture
- Extend or debug features safely

## 2. Stack and Core Libraries

- React 19 + Vite 8 + TypeScript
- Tailwind CSS
- @immich/sdk (OpenAPI-generated API client)
- @tanstack/react-query (server state)
- Zustand (local/global app state)
- React Router
- @tanstack/react-virtual (timeline virtualization)

## 3. Repository Layout

- src/main.tsx: app bootstrap, query provider, auth client initialization
- src/App.tsx: route table + global shortcuts overlay
- src/api/client.ts: SDK init + base URL helpers
- src/store/auth.ts: auth/session lifecycle
- src/store/selection.ts: selected asset IDs store
- src/components/: reusable UI (grid, viewer, toolbar, overlays)
- src/pages/: route-level pages
- vite.config.ts: Vite config + /api proxy target

## 4. Local Development Setup

### 4.1 Install

```bash
npm install
```

### 4.2 Run Dev Server

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

### 4.3 Build Check

```bash
npm run build
```

## 5. Remote Immich Server Configuration

Dev mode uses a Vite proxy from /api to an Immich host.

Current proxy source in vite.config.ts:

- env: VITE_IMMICH_URL
- fallback: http://192.168.50.18:2283

To target a different Immich server in PowerShell:

```powershell
$env:VITE_IMMICH_URL="http://YOUR_IMMICH_HOST:2283"
npm run dev
```

### 5.1 Verify Connectivity

```powershell
Test-NetConnection YOUR_IMMICH_HOST -Port 2283
```

If localhost:5173 is running, verify proxy path:

```powershell
try { (Invoke-WebRequest -Uri "http://localhost:5173/api/auth/status" -Method Get -TimeoutSec 10).StatusCode } catch { if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { $_.Exception.Message } }
```

Expected when not logged in: 401.

## 6. Authentication Flow

### 6.1 Login Page

src/pages/LoginPage.tsx handles:

- email/password login
- API key login
- OAuth start flow
- locked-session unlock

### 6.2 Session Validation

src/store/auth.ts:

- bearer token validation is best-effort for compatibility
- getMyUser is authoritative for usable authenticated state
- getAuthStatus is treated as optional for cross-version support

## 7. Feature Map by Area

### 7.1 Timeline

- Page: src/pages/TimelinePage.tsx
- Grid: src/components/AssetGrid.tsx
- Viewer: src/components/AssetViewer.tsx
- Bulk actions: album/tag/archive/favorite/share/trash/download

### 7.2 Albums

- src/pages/AlbumsPage.tsx
- src/pages/AlbumDetailPage.tsx

### 7.3 Search

- src/pages/SearchPage.tsx
- supports smart + metadata search and suggestions

### 7.4 Sharing

- src/pages/SharingPage.tsx
- src/pages/PartnersPage.tsx

### 7.5 People and Tags

- src/pages/PeoplePage.tsx
- src/pages/TagsPage.tsx

### 7.6 Keyboard Shortcuts

- Hook: src/hooks/useKeyboard.ts
- Overlay: src/components/ShortcutsOverlay.tsx
- Global toggle: ? (Shift + /)

### 7.7 Extras (Phase 11)

- src/pages/TrashPage.tsx
- src/pages/MemoriesPage.tsx
- src/pages/DuplicatesPage.tsx
- src/pages/SettingsPage.tsx

## 8. Routing

Routes are defined in src/App.tsx.

Primary routes currently include:

- /
- /albums
- /albums/:albumId
- /people
- /search
- /tags
- /sharing
- /sharing/partners
- /trash
- /memories
- /duplicates
- /settings
- /login
- /auth/callback

## 9. State Management Rules

### 9.1 Server Data

Use React Query for all API-backed state:

- query keys should be stable and scoped by feature
- invalidate related keys after mutations

### 9.2 Local UI State

Use local component state for:

- modal visibility
- input drafts
- ephemeral status banners

### 9.3 Global Shared State

Use Zustand only for:

- auth session state
- selection state

## 10. Error Handling Conventions

- Prefer user-visible status messages for mutation outcomes
- Preserve actionable failure text when available
- For API compatibility uncertainty, use graceful fallbacks (avoid hard-failing secondary checks)

## 11. Mobile and Layout Conventions

- Header nav supports horizontal scrolling on narrow widths
- Keep page-level actions in wrap-friendly button groups
- Avoid fixed-width-only control rows

## 12. Debugging Playbook

### 12.1 Login Works in Immich UI but Fails Here

1. Verify proxy target in vite.config.ts and env overrides
2. Confirm remote API reachability from local machine
3. Test local proxy endpoint (/api/auth/status)
4. If proxy returns 502/ECONNREFUSED, fix network/target first

### 12.2 Dev Server Healthy but API Calls Fail

- Check VITE_IMMICH_URL in the same shell session that started npm run dev
- Restart dev server after env changes

### 12.3 Type Errors After SDK or API Changes

- Re-check SDK type signatures in node_modules/@immich/sdk/build/fetch-client.d.ts
- Wrap mutations with explicit parameter lambdas when generic inference fails

## 13. Contribution Workflow

1. Create focused change (single feature or bug)
2. Keep patches minimal and style-consistent
3. Run:

```bash
npm run build
```

4. Validate affected flows manually in browser
5. Update README and this guide when behavior/setup changes

## 14. Known Constraints

- Tag rename is not exposed in current SDK shape used by this repo
- Some auth-status related endpoints can vary by server version
- Proxy behavior depends on local network access to target Immich host

## 15. Suggested Next Improvements

- Add end-to-end smoke tests for login and timeline load
- Add .env.example for VITE_IMMICH_URL and VITE_IMMICH_API_URL
- Add CI build/lint checks
- Add screenshots and flow diagrams in docs
