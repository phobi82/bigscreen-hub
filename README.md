# Bigscreen Interactive Hub

Bigscreen Interactive Hub is a static browser application for shared room state, website handoff, room chat, synchronized YouTube playback, and VDO.Ninja screen streaming.

## GitHub Pages

Live website: https://phobi82.github.io/bigscreen-hub/

This repository contains the complete public website. Publish the `main` branch from the repository root with GitHub Pages. No build step, deployment token, or generated branch is required.

## Architecture

- Trystero provides peer discovery, room presence, control messages, and in-memory state synchronization.
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

Receiver mode provides an address bar that opens HTTP(S) websites locally and, when the shared "Also send link" option is enabled, sends them to the other room participants. It additionally provides local quick links that use the same option. Controller mode provides an address bar that only sends HTTP(S) links, and can edit the Sharepad, start a VDO.Ninja screen share, and stop the active stream. Receiver mode displays the active VDO.Ninja stream. Received links always require confirmation unless their sender is locally ignored.

Both modes provide a synchronized YouTube player for videos and playlists. Rooms start without a master, so play, pause, seek, playlist, and playback-rate changes from any synchronized participant become the shared state. A participant can take over as master and optionally lock further takeovers. A follower who changes shared playback controls locally leaves synchronization until selecting `Not sync` to follow the room again. Volume, captions, and playback quality always remain local. If a master leaves, the room returns to shared control without forcing locally detached participants back into synchronization.

Both modes include a room chat and Sharepad behind a shared community disclaimer. Accepting the basic rules enables both features; the optional nickname may be left empty to participate as `Anonymous`. A saved nickname can be changed after 48 hours. Declining leaves Chat and Sharepad unavailable. The chat also shows transient join, leave, website, quick-link, and stream activity. Custom website URLs are not included in activity messages. Chat history is not synchronized with later room joins and is cleared when leaving or reloading.

## Local Data

The community-disclaimer acceptance, local chat profile (stable user ID, optional name, and last-change timestamp), and per-user ignore rules are stored in `localStorage`. Room state, Sharepad content, YouTube playback and roles, stream IDs, chat messages, and peer information are not persisted.

Ignore rules are local to the browser and use the stable user ID rather than the changeable display name. They apply independently to chat plus Sharepad, and to links plus streams.

The user list marks Web and VR sessions with distinct badges. Clicking or right-clicking a user in the list or chat opens the same local rule menu.

## Security

- Received links are restricted to HTTP and HTTPS.
- Received links always require explicit confirmation.
- Received text is rendered through DOM text properties.
- Chat message length is limited to 1,000 characters.
- Stream IDs use 128 bits of randomness.
- YouTube master locking is cooperative room behavior, not an access-control boundary.
- The default room ID is public and is not an access-control mechanism.
