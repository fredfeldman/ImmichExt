# ImmichExt — Release Notes v1.0.0

**Release Date:** June 7, 2026

---

## Overview

Initial stable release of ImmichExt — a full-featured React SPA alternative frontend for self-hosted [Immich](https://immich.app/) servers.

---

## Features

### Authentication
- Email/password login with JWT token persistence
- Optional API key authentication mode
- OAuth redirect support
- Auto token validation on app load
- Logout support

### Timeline & Asset Grid
- Time-bucketed photo/video timeline grouped by year and month
- Virtualized grid (TanStack Virtual) for high-performance rendering of large libraries
- Responsive column count adapts to screen width
- Lazy thumbnail loading

### Multi-Select
- **Shift+click** — range select
- **Ctrl+click** — toggle individual assets
- **Ctrl+A** — select all visible assets
- Click-drag selection

### Asset Viewer
- Lightbox viewer with previous/next navigation (arrow keys)
- Zoom support
- Video playback with HLS streaming
- Metadata sidebar — EXIF, GPS, albums, people tags, favorites, star rating

### Comment Panel (Key Differentiator)
- Inline add, edit, and delete comments directly in the viewer
- Click-to-edit in place — no modal required
- `C` keyboard shortcut to open/focus the comment panel

### Bulk Operations
- Floating bulk toolbar appears when one or more assets are selected
- Actions: Add to Album, Tag, Archive, Favorite, Download ZIP, Share Link, Trash/Delete
- `BulkAlbumPicker` and `BulkTagPicker` quick-pick modals

### Albums
- Album grid with create/delete and shared indicator
- Album detail view — asset grid, add/remove assets, rename, share

### Search
- Smart search (CLIP semantic search)
- Metadata filter search
- Typeahead suggestions in the nav search bar
- Filter panel — date range, camera model, location, people, tags

### Sharing
- Shared links management — list, create, edit, delete
- Simplified share dialog — pick album or assets, set optional expiry/password, copy link
- Partners page — manage partner sharing (shared-by / shared-with)

### People & Tags
- People page — face thumbnail grid, browse assets by person
  - Rename, favorite toggle, hidden toggle, delete person
- Tags page — tag browser, bulk-assign from asset viewer

### Keyboard Shortcuts
- Global + context-aware keyboard shortcut system
- `?` — Show shortcuts overlay

| Key | Action |
|---|---|
| `?` | Show shortcuts overlay |
| `←` / `→` | Previous / next asset in viewer |
| `F` | Toggle favorite |
| `A` | Toggle archive |
| `Del` | Move to trash |
| `C` | Open/focus comment panel |
| `S` | Open share dialog / create shared link |
| `0–5` | Set star rating |
| `Ctrl+A` | Select all visible assets |
| `Esc` | Close viewer / deselect / close overlay |

### Extras
- **Trash page** — restore or permanently delete trashed assets
- **Memories page** — On This Day memories browsing
- **Duplicates page** — review and resolve duplicate asset groups
- **Settings page** — user profile, preferences, server info
- **Mobile-responsive layout** — horizontal-scrollable nav, adaptive search bar

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

## Notes

- Requires a running Immich server (API base URL: `http://<your-server>:2283/api`)
- In development, Vite proxies `/api` to avoid CORS; in production use a same-origin reverse proxy (Nginx/Caddy)
