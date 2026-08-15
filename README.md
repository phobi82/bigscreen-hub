# Bigscreen Interactive Hub

Bigscreen Interactive Hub is a static browser application for shared room state, website handoff, room chat, synchronized YouTube playback, and VDO.Ninja screen streaming.

## GitHub Pages

Live website: https://phobi82.github.io/bigscreen-hub/?room=github

This repository contains the complete public website. Pushes to `main` deploy it through the GitHub Pages workflow in `.github/workflows/pages.yml`; no application build step or generated branch is required.

## Architecture

- Trystero provides peer discovery, room presence, control messages, and in-memory state synchronization, including the room's YouTube queue.
- The YouTube IFrame Player API provides local video and playlist playback.
- VDO.Ninja provides screen publishing and playback.
- The application has no backend, database, accounts, analytics, or persistent room state.
- Shared state exists while at least one browser remains connected to the room.

## Usage

Serve the repository through HTTPS or a local development origin and open `index.html`.

| URL | Mode |
| --- | --- |
| `/` | Controller with room `bigscreen` prefilled |
| `/?room=example` | Controller, automatically joins room `example` |
| `/?mode=view` | Receiver with room `bigscreen` prefilled |
| `/?mode=view&room=example` | Receiver, automatically joins room `example` |

Both modes use the same compact layout for the vertically limited Bigscreen in-game browser: equally wide chat and YouTube panels are followed by website tools and the full-width Sharepad. Receiver-only controls add the compact controller address and collapsed quick links; controller-only controls add screen sharing. The receiver address bar opens HTTP(S) websites locally and, when "Also send link" is enabled, sends them to the other room participants. The controller address bar only sends HTTP(S) links. Receiver mode displays the active VDO.Ninja stream. Received links always require confirmation unless their sender is locally ignored.

Both modes provide a synchronized YouTube player for video and playlist URLs. Search can target embeddable videos or playlists; each result offers separate actions to play now, append it to the room queue, or save it to the personal playlist. Pasted URLs offer the same actions without making an additional metadata request. Search-supplied titles, channels, thumbnails, dates, and descriptions are retained with copied entries; URL-only entries use their IDs and an available video thumbnail.

Each connected participant retains played queue entries as local history and marks the boundary to upcoming entries with a cursor. Only the upcoming section is synchronized, so a later join does not receive earlier entries. Playing unrelated content immediately does not change the cursor. A queued video advances when it ends. A queued YouTube playlist remains one atomic entry and advances only after its final video; playlist contents are not fetched through the quota-consuming Data API. Queue entries can be copied to the personal playlist and vice versa, reordered within the upcoming section, removed, or played immediately. The local queue view is a 200-entry ring buffer: adding beyond the limit removes the oldest entry only when it is already history and not the currently playing queue entry; adding is rejected when no such entry exists. The synchronized upcoming queue exists only while at least one peer retains the room state.

Rooms start without a controller, so play, pause, seek, playlist, playback-rate, and queue changes from any synchronized participant become shared state. A participant can take control, optionally allow shared control, independently allow all room participants to append queue entries, and lock further takeovers. The controller can release control or give it to another connected participant from the user menu. `Stop syncing` switches to local playback; `Sync` follows the current room state again. A controller who switches to local playback releases control first. A participant who changes playback while exclusive control is active also leaves synchronization. A controller's local `Ignore YouTube control` rule rejects that user's shared playback requests, queue requests, and takeovers. Volume, captions, and playback quality always remain local. If a controller leaves, the room returns to shared control without forcing locally detached participants back into synchronization.

Both modes include a room chat and Sharepad behind a shared community disclaimer. Accepting the basic rules enables both features; the optional nickname may be left empty to participate as `Anonymous`. A saved nickname can be changed after 48 hours. Declining leaves Chat and Sharepad unavailable. Consecutive messages from the same user share one compact chat box until another user or a room activity interrupts the group. The chat also shows transient join, leave, website, quick-link, and stream activity. Custom website URLs are not included in activity messages. Chat history is not synchronized with later room joins and is cleared when leaving or reloading.

## Local Data

The community-disclaimer acceptance, local chat profile (stable user ID, optional name, and last-change timestamp), per-user ignore rules, and personal YouTube playlist are stored in `localStorage`. The personal playlist is limited to 800 entries and is local to the browser origin. Room state, Sharepad content, YouTube playback, room queue and roles, stream IDs, chat messages, and peer information are not persisted.

Ignore rules are local to the browser and use the stable user ID rather than the changeable display name. They apply independently to chat plus Sharepad, links plus streams, and YouTube control. The YouTube rule affects the room only while its owner is the controller.

The user list marks Web and VR sessions with distinct badges. Clicking or right-clicking a user in the list or chat opens the same local rule menu.

## Security

- Received links are restricted to HTTP and HTTPS.
- Received links always require explicit confirmation.
- Received text is rendered through DOM text properties.
- Chat message length is limited to 1,000 characters.
- Stream IDs use 128 bits of randomness.
- YouTube control, takeover locking, and ignore rules are cooperative room behavior, not an access-control boundary.
- YouTube entry metadata and queue payloads are length-limited and validated before display or synchronization.
- The default room ID is public and is not an access-control mechanism.
