# ImmichExt

ImmichExt is an alternative React frontend for Immich, focused on faster daily workflows, especially comments, bulk actions, keyboard navigation, and family sharing.

This project uses the official Immich REST API via @immich/sdk.

## Documentation

- Developer Guide: [DevloperGuide_ImmichExt.md](DevloperGuide_ImmichExt.md)
- User Guide: [UserGuide_ImmichExt.md](UserGuide_ImmichExt.md)

## Highlights

- React + Vite + TypeScript SPA
- Tailwind UI
- Authentication with bearer token, API key, and OAuth flow
- Timeline with virtualized asset grid for large libraries
- In-viewer quick comments and keyboard actions
- Bulk actions (album, tags, archive, favorite, share, trash, download)
- Albums, Search, Sharing, People, Tags
- Extras pages: Trash, Memories, Duplicates, Settings

## Stack

- React 19
- Vite 8
- TypeScript
- @immich/sdk
- @tanstack/react-query
- @tanstack/react-virtual
- Zustand
- React Router
- Tailwind CSS

## Requirements

- Node.js 20+ (recommended)
- npm 10+
- A reachable Immich server

## Quick Start (Local Dev)

1. Install dependencies:

```bash
npm install
```

2. Start dev server:

```bash
npm run dev
```

3. Open:

```text
http://localhost:5173
```

## Connect to a Remote Immich Server

Dev mode uses a Vite proxy for /api calls.

By default, the proxy target is read from VITE_IMMICH_URL in vite.config.ts and falls back to:

```text
http://192.168.50.18:2283
```

To set your own target for the current terminal session:

PowerShell:

```powershell
$env:VITE_IMMICH_URL="http://YOUR_IMMICH_HOST:2283"
npm run dev
```

## Build and Preview

```bash
npm run build
npm run preview
```

If you preview/build against a direct API URL instead of local proxy, set:

```powershell
$env:VITE_IMMICH_API_URL="http://YOUR_IMMICH_HOST:2283/api"
```

## Available Scripts

- npm run dev: start development server
- npm run build: typecheck and production build
- npm run preview: serve production build locally
- npm run lint: run ESLint

## Troubleshooting

### Login fails with 502 or ECONNREFUSED

This usually means the frontend can run, but the Vite proxy cannot reach Immich.

Check:

- VITE_IMMICH_URL points to the correct server and port
- The Immich server is reachable from this machine
- Firewall/router rules allow access to port 2283

### Login works in official Immich UI but fails here

Recent updates made post-login checks more tolerant across Immich versions. If it still fails, copy the exact error text shown in the app and check dev terminal proxy logs.

## Current App Sections

- Timeline
- Albums
- People
- Search
- Tags
- Sharing
- Trash
- Memories
- Duplicates
- Settings

## Notes

- This project is an independent frontend implementation against Immich APIs.
- Ensure your deployment and usage comply with Immich licensing and your environment security requirements.
