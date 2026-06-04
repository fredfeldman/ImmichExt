# ImmichExt — Custom React Frontend for Immich

## Context

- **Immich** is a self-hosted photo/video management app (Google Photos alternative, AGPLv3)
- Current official frontend: SvelteKit web app
- **Goal**: Build a full-featured React SPA as an alternative frontend targeting a remote Immich server
- **Immich API**: Pure REST, OpenAPI 3.0 spec at `open-api/immich-openapi-specs.json`
- **API base URL**: `http://<your-server>:2283/api`

## Key Differentiators

1. **Comment management** — Quick comment panel in-viewer, keyboard shortcut (`C`), inline add/edit/delete, fewer clicks vs. official UI
2. **Bulk operations** — Multi-select (Shift+click, Ctrl+click, Ctrl+A), floating bulk toolbar for tag/album/delete/download/share
3. **Family-friendly sharing** — Simplified sharing dialog, partner view toggle, shared link management
4. **Keyboard shortcuts** — Global shortcut system with overlay (`?`), covering nav, rate, tag, favorite, archive, share

---

## Stack

| Concern | Library |
|---|---|
| Framework | React 18 + Vite (TypeScript, SPA) |
| Styling | Tailwind CSS |
| API client | `@immich/sdk` (official, OpenAPI-generated) |
| Data fetching | TanStack Query |
| Virtualization | TanStack Virtual |
| Global state | Zustand |
| Routing | React Router v6 |
| Icons | lucide-react |
| Notifications | sonner |
| Dates | date-fns |

---

## Architecture

- **API client**: Wraps `@immich/sdk`, reads Bearer token from Zustand/localStorage, injects via SDK config
- **Vite proxy**: In dev, `/api` → `http://<server>:2283` (avoids CORS); in prod, use same-origin reverse proxy (Nginx/Caddy)
- **Auth**: JWT from `POST /api/auth/login`, stored in Zustand + `localStorage`; auto-validated on load via `GET /api/auth/validate-token`
- **Timeline**: Time-bucketed virtual grid via `GET /api/timeline/buckets` + `GET /api/timeline/bucket`

---

## Phases

### Phase 1 — Foundation
- Scaffold: Vite `react-ts` template, install all deps
- `vite.config.ts` — proxy `/api` to Immich server, Tailwind plugin
- `src/api/client.ts` — configure `@immich/sdk` with base URL + auth token injection
- `src/store/auth.ts` — Zustand store (token, user profile, login/logout actions)
- `src/store/selection.ts` — Zustand store for multi-selected asset IDs
- `src/App.tsx` — React Router routes + `ProtectedRoute` wrapper

### Phase 2 — Authentication
- `LoginPage` — email/password form, optional API key mode, OAuth redirect support
- Token persistence in `localStorage`, auto-validate on load
- Logout, session lock/unlock (PIN) support

### Phase 3 — Timeline & Asset Grid
- `TimelinePage` — fetches `/api/timeline/buckets`, groups by year/month with date headers
- `AssetGrid` — TanStack Virtual virtualized grid, responsive column count, lazy thumbnail loading
- Multi-select: Shift+click (range), Ctrl+click (toggle), Ctrl+A (all), click-drag

### Phase 4 — Asset Viewer
- `AssetViewer` (lightbox) — prev/next (arrow keys), zoom, video playback + HLS streaming
- Metadata sidebar — EXIF, GPS, albums, people tags, favorites/rating
- **`CommentPanel`** — **key differentiator**: inline add/edit/delete, click-to-edit in place, `C` key to open/focus, no modal required

### Phase 5 — Bulk Operations
- `BulkToolbar` — floats up when ≥1 asset selected
- Actions: Add to Album, Tag, Archive, Favorite, Download ZIP, Share Link, Trash/Delete
- `BulkAlbumPicker` / `BulkTagPicker` quick-pick modals

### Phase 6 — Albums
- `AlbumsPage` — album grid, create/delete, shared indicator
- `AlbumDetailPage` — asset grid, add/remove assets, rename, share

### Phase 7 — Search
- `SearchPage` — smart (CLIP `POST /api/search/smart`) + metadata filter (`POST /api/search/metadata`)
- Nav `SearchBar` — typeahead via `GET /api/search/suggestions`
- Filter panel — date range, camera model, location, people, tags

### Phase 8 — Sharing
- `SharedLinksPage` — list/create/edit/delete shared links
- `ShareDialog` — simplified: pick album or assets → set optional expiry/password → copy link
- `PartnersPage` — partner sharing management

### Phase 9 — People & Tags
- `PeoplePage` — face thumbnail grid, click to browse assets by person
- `TagsPage` — tag browser, inline rename, bulk-assign from asset viewer

### Phase 10 — Keyboard Shortcuts
- `useKeyboard` hook — global + context-aware bindings
- `ShortcutsOverlay` (`?` key) — modal listing all shortcuts
- Key bindings:

| Key | Action |
|---|---|
| `?` | Show shortcuts overlay |
| `←` / `→` | Prev / next asset in viewer |
| `F` | Toggle favorite |
| `A` | Toggle archive |
| `Del` | Move to trash |
| `C` | Open/focus comment panel |
| `S` | Open share dialog |
| `0–5` | Set star rating |
| `Ctrl+A` | Select all visible assets |
| `Esc` | Close viewer / deselect |

### Phase 11 — Extras (post-MVP)
- Trash page (restore / delete forever)
- Memories page (on-this-day via `GET /api/memories`)
- Duplicates review page (`GET /api/duplicates`)
- Mobile-responsive layout polish
- Settings page (profile, API keys, server info)

---

## Key Source Files

| File | Purpose |
|---|---|
| `vite.config.ts` | API proxy, Tailwind plugin |
| `src/main.tsx` | App entry point |
| `src/App.tsx` | Routes + ProtectedRoute |
| `src/api/client.ts` | `@immich/sdk` config with auth injection |
| `src/store/auth.ts` | Zustand auth store |
| `src/store/selection.ts` | Multi-select state |
| `src/pages/LoginPage.tsx` | Login form |
| `src/pages/TimelinePage.tsx` | Main photo timeline |
| `src/pages/AlbumsPage.tsx` | Albums list |
| `src/pages/AlbumDetailPage.tsx` | Album contents |
| `src/pages/SearchPage.tsx` | Search + filters |
| `src/pages/PeoplePage.tsx` | Face/person browser |
| `src/pages/SharedLinksPage.tsx` | Shared link management |
| `src/components/AssetGrid.tsx` | Virtualized photo grid |
| `src/components/AssetViewer.tsx` | Lightbox viewer |
| `src/components/CommentPanel.tsx` | Inline comment management |
| `src/components/BulkToolbar.tsx` | Floating bulk-action bar |
| `src/components/ShortcutsOverlay.tsx` | Keyboard shortcuts modal |
| `src/hooks/useKeyboard.ts` | Keyboard shortcut system |

---

## Key Immich API Endpoints

### Auth
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Login → returns `accessToken` |
| `POST` | `/api/auth/logout` | Logout |
| `POST` | `/api/auth/validate-token` | Validate token on load |
| `POST` | `/api/auth/session/lock` | Lock session |
| `POST` | `/api/auth/session/unlock` | Unlock with PIN |

### Timeline
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/timeline/buckets` | Time bucket list with counts |
| `GET` | `/api/timeline/bucket` | Assets in a specific bucket |

### Assets
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/assets` | Upload |
| `GET` | `/api/assets/{id}/thumbnail` | Thumbnail (`?size=thumbnail\|preview`) |
| `GET` | `/api/assets/{id}/original` | Download original |
| `GET` | `/api/assets/{id}/video/playback` | Stream video |
| `GET` | `/api/assets/{id}/video/playlist.m3u8` | HLS playlist |
| `DELETE` | `/api/assets` | Bulk delete/trash |

### Comments (Activity)
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/activity` | Get comments/reactions on an album asset |
| `POST` | `/api/activity` | Add a comment or reaction |
| `DELETE` | `/api/activity/{id}` | Delete a comment |

### Search
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/search/smart` | CLIP/AI semantic search |
| `POST` | `/api/search/metadata` | Metadata/filter search |
| `GET` | `/api/search/suggestions` | Typeahead suggestions |

### Albums
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/albums` | List albums |
| `POST` | `/api/albums` | Create album |
| `GET` | `/api/albums/{id}` | Album detail + assets |
| `PATCH` | `/api/albums/{id}` | Update album |
| `DELETE` | `/api/albums/{id}` | Delete album |
| `PUT` | `/api/albums/{id}/assets` | Add assets |
| `DELETE` | `/api/albums/{id}/assets` | Remove assets |

### Sharing
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/shared-links` | List shared links |
| `POST` | `/api/shared-links` | Create shared link |
| `PATCH` | `/api/shared-links/{id}` | Update (expiry, password) |
| `DELETE` | `/api/shared-links/{id}` | Delete |

---

## Verification Checklist

- [ ] `npm run dev` starts, proxies to Immich server without CORS errors
- [ ] Login succeeds, token persists across page refresh
- [ ] Timeline scrolls smoothly through thousands of photos (virtualized)
- [ ] Multi-select → bulk toolbar → "Add to Album" works end-to-end
- [ ] Comments: viewer open → press `C` → type → Enter → done (≤3 actions)
- [ ] All keyboard shortcuts fire correctly in viewer and grid
- [ ] Share link creation and access by non-logged-in user works
- [ ] `npm run build` produces a working deployable SPA

---

## Deployment Notes

- **Dev**: Vite proxy handles CORS (`/api` → `http://server:2283`)
- **Prod**: Serve `dist/` from same origin as Immich via reverse proxy (Nginx/Caddy), OR configure Immich CORS allowlist for a separate subdomain
- **Env var**: `VITE_IMMICH_URL=http://your-server:2283` (used in `vite.config.ts` proxy and prod SDK base URL)
