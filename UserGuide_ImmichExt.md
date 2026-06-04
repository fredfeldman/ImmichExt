# User Guide: ImmichExt

## 1. What Is ImmichExt?

ImmichExt is an alternative web interface for Immich focused on:

- Faster browsing with keyboard support
- Quick comments in the viewer
- Bulk actions for albums, tags, sharing, and cleanup
- Simple pages for sharing, people, tags, memories, duplicates, and settings

## 2. Getting Started

### 2.1 Open the App

In your browser, open:

- http://localhost:5173

### 2.2 Sign In

On the login page, choose one of these methods:

- Email Login: email + password
- API Key: paste your Immich API key
- OAuth: use your server OAuth flow if enabled

If your session is locked, enter your PIN or password to unlock.

## 3. Main Navigation

Top navigation tabs include:

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

Tip: On smaller screens, the tab bar scrolls horizontally.

## 4. Timeline Basics

Timeline is your main photo/video browser.

You can:

- Scroll through assets grouped by date
- Click to select assets
- Shift+click to select ranges
- Ctrl/Cmd+click to add/remove individual assets
- Double-click an asset to open the viewer

## 5. Asset Viewer

Inside the viewer:

- Left/Right arrow: previous/next asset
- C: focus quick comment box
- F: toggle favorite
- A: toggle archive
- 0-5: set rating
- Delete: move to trash
- S: create and copy share link
- Escape: close viewer

## 6. Quick Comments

In viewer sidebar:

- Add local notes per asset using Quick Comments
- Edit and delete existing comments
- Ctrl/Cmd+Enter submits a comment quickly

Notes are stored locally in your browser for this app.

## 7. Bulk Actions

When one or more assets are selected, use the bulk toolbar to:

- Add to album
- Add/apply tags
- Favorite
- Archive
- Download as ZIP
- Create shared link
- Move to trash

## 8. Albums

### 8.1 Albums Page

- View all albums
- Create and delete albums

### 8.2 Album Detail

- Rename/update album details
- Add selected assets to album
- Remove selected album assets
- Open album assets in viewer

## 9. Search

Search supports two modes:

- Smart Search: semantic text-style query
- Metadata Search: filters by date, camera, location, people, tags, and more

You can combine filters and browse results in the same asset grid/viewer pattern.

## 10. Sharing

### 10.1 Shared Links

On Sharing page you can:

- Create album links or asset links
- Set optional password and expiration
- Toggle download and metadata visibility
- Copy/open/delete links

### 10.2 Partners

On Partners page you can:

- Create partner sharing relationship
- Toggle whether partner assets appear in timeline
- Remove partner relationship

## 11. People and Tags

### 11.1 People

- Browse detected people
- Filter people list
- Rename person
- Toggle favorite/hidden state
- View all assets for selected person

### 11.2 Tags

- Create tags
- Filter and browse tags
- Update tag color
- Delete tags
- Apply/remove active tag to/from currently selected assets

## 12. Trash

- Browse trashed assets
- Restore selected assets
- Empty trash permanently (confirmation required)

## 13. Memories

- Browse on-this-day memories
- Open memory assets in grid/viewer

## 14. Duplicates

- Review duplicate groups
- Use suggested keep action
- Resolve or remove duplicate groups

## 15. Settings

- View profile details
- View server info (version/build/runtime)
- Toggle available user preference switches exposed by server

## 16. Keyboard Shortcuts Overlay

Press:

- ? (Shift + /)

to open the shortcuts overlay.

Press Escape to close it.

## 17. Troubleshooting

### 17.1 Login Fails

If you see login failure but credentials work in Immich:

- Refresh the app (Ctrl+F5)
- Ensure the app is connected to the correct Immich server
- Restart dev server if needed

### 17.2 Proxy/Server Connectivity Errors

If you see 502 or ECONNREFUSED in dev logs:

- The local app is running, but cannot reach the remote Immich server
- Check server IP/port and network/firewall rules

### 17.3 Empty Pages

If data pages look empty unexpectedly:

- Confirm you are signed in
- Check active filters (Search, Tags, People)
- Try full refresh

## 18. Privacy and Data Notes

- Media and account data come from your Immich server
- Quick Comments are local to this browser (not synced to Immich server in current implementation)

## 19. Best Practices

- Use API key mode for automation-focused or long-lived local sessions
- Use keyboard shortcuts for faster triage and curation
- Use bulk actions from timeline for large cleanups
- Review trash and duplicates regularly
