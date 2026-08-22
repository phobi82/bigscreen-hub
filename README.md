# Bigscreen Interactive Hub

Bigscreen Interactive Hub is a static browser application for shared room state, website handoff, room chat, synchronized YouTube playback, and multiple VDO.Ninja camera or screen streams.

## GitHub Pages

Live website: https://phobi82.github.io/bigscreen-hub/?room=github

This repository contains the complete public website. Pushes to `main` deploy it through the GitHub Pages workflow in `.github/workflows/pages.yml`; no application build step or generated branch is required.

## Architecture

- Trystero provides peer discovery, room presence, control messages, and in-memory state synchronization, including the room's YouTube queue.
- The YouTube IFrame Player API provides local video and playlist playback.
- VDO.Ninja provides public room-based screen publishing and private camera or screen publishing through one selected embedded player.
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

Room IDs are case-sensitive and must contain 1–49 ASCII letters or digits. Invalid form values and `room` URL parameters are rejected rather than modified.

Media, website handoff, chat, Sharepad, stream publishing, and all invitation handling become available only after the local Community access confirmation. Until then the peer advertises a rejecting invitation policy and does not load the embedded media players.

Both modes use the same compact layout for the vertically limited Bigscreen in-game browser: equally wide chat and media panels are followed by website tools and the full-width Sharepad. Receiver-only controls add the compact controller address and collapsed quick links; controller-only controls add stream publishing. Link fields and quick links share one session-only audience with `Everyone` and a multiple-user mode. The user list always remains a user list with contextual actions. Choosing link recipients opens a dedicated dialog whose checkboxes are immediately available; its primary button performs the concrete `Send link` or `Open and send` action instead of applying an intermediate selection. The receiver address bar opens HTTP(S) websites locally and, when "Also send link" is enabled, also sends an invitation to the selected audience. The controller address bar only sends the invitation. A user's context menu provides `Send link…` for a direct invitation through a focused URL dialog. Received links always require confirmation.

Receiver and controller modes show the same media tabs. `Stream` appears only while at least one invited target exists or the waiting public Hub player reports an actual external source. It contains one VDO.Ninja player and a compact list of invited Public and Private targets. Only the selected target is loaded, and it remains loaded when YouTube is selected. The first invited stream opens automatically. A different target is added to the list and asks before switching; declining keeps it available for manual selection. Multiple publishers invited to the same public VDO room share one list entry and the existing scene mixer without another prompt. When the selected target ends, the most recently invited active target is selected. With no remaining source, YouTube is selected and the Stream tab is hidden.

Both modes provide a synchronized YouTube player for video and playlist URLs. A shared YouTube dialog keeps its search field above accessible Search, Room Queue, and Personal Playlist tabs. Search can target embeddable, externally playable videos or playlists; compact arrow actions copy entries between the search results, room queue, and personal playlist while detailed views retain playback and editing controls. Search-supplied metadata is retained with copied entries. Direct video URLs resolve titles, authors, and thumbnails through YouTube oEmbed; direct playlist URLs use a batched `playlists.list` snippet request. Missing metadata is resolved only when an older entry becomes visible, and stable content IDs remain available when lookup fails. The application does not request playlist contents or use `playlistItems.list`.

Each connected participant retains played queue entries as local history and marks the boundary to upcoming entries with a cursor. Only the upcoming section is synchronized, so a later join does not receive earlier entries. Playing unrelated content immediately does not change the cursor. A queued video advances when it ends. A queued YouTube playlist remains one atomic entry and advances only after its final video; playlist contents are not fetched through the quota-consuming Data API. Queue entries can be copied to the personal playlist and vice versa, reordered within the upcoming section, removed, or played immediately. The local queue view is a 200-entry ring buffer: adding beyond the limit removes the oldest entry only when it is already history and not the currently playing queue entry; adding is rejected when no such entry exists. The synchronized upcoming queue exists only while at least one peer retains the room state.

Rooms start without a controller, so play, pause, seek, playlist, playback-rate, and queue changes from any synchronized participant become shared state. A participant can take control, optionally allow shared control, independently allow all room participants to append queue entries, and lock further takeovers. The controller can release control or give it to another connected participant from the user menu. `Stop syncing` switches to local playback; `Sync` follows the current room state again. A controller who switches to local playback releases control first. A participant who changes playback while exclusive control is active also leaves synchronization. A controller's local `Ignore YouTube control` rule rejects that user's shared playback requests, queue requests, and takeovers. Volume, captions, and playback quality always remain local. If a controller leaves, the room returns to shared control without forcing locally detached participants back into synchronization.

Each Hub session can publish one stream while any number of sessions publish simultaneously. The start dialog separates a `Public room stream` from a `Private stream`. `Share screen with room` opens a VDO.Ninja screen publisher in a case-sensitive public room chosen at start; the current Hub room is the default. VDO.Ninja assigns that publisher's stream ID, and anyone who knows the VDO room or scene URL can publish or watch without joining the Hub. `Start private camera/screen` creates a 128-bit random push ID before opening VDO.Ninja, which then offers camera or screen selection. Publishers run in a same-origin wrapper so Stop, popup close, room leave, and page exit reliably unload the cross-origin VDO.Ninja frame. Private sharing is capability privacy, not authentication or DRM.

Stream lifecycle state is maintained per publisher, including stop records for late joiners, but contains no public destination or private push ID. Destinations are sent only through targeted, session-only invitations after peers exchange their invitation policies. Starting a public stream automatically invites every current and later participant who permits the publisher. Private stream start offers an optional multi-user checklist with a `Select all available people` shortcut; its primary button states whether the stream starts only for the publisher or for the selected number of people. With no selection the stream starts as a local preview and its push ID is not sent. While publishing, `Invite to stream` in a user's context menu can extend either audience. The publisher remembers explicitly invited private recipients for reconnects. Stopping, closing a publisher popup, leaving, or disconnecting removes only that publisher from its target. The local `Ignore links and streams` rule blocks both general and direct link or stream invitations from that user, removes their attributable sources, and is also announced to the sender so private IDs are not transmitted. Unknown recipient policies default to no delivery.

Both modes include a room chat and Sharepad behind a shared community disclaimer. Accepting the basic rules enables both features; the optional nickname may be left empty to participate as `Anonymous`. A saved nickname can be changed after 48 hours. Declining leaves Chat and Sharepad unavailable. Consecutive messages from the same user share one compact chat box until another user or a room activity interrupts the group. The chat also shows transient join, leave, website, quick-link, and stream activity. Custom website URLs are not included in activity messages. Chat history is not synchronized with later room joins and is cleared when leaving or reloading.

## Local Data

The community-disclaimer acceptance, local chat profile (stable user ID, optional name, and last-change timestamp), per-user ignore rules, and personal YouTube playlist are stored in `localStorage`. The personal playlist is limited to 800 entries and is local to the browser origin. Room state, Sharepad content, YouTube playback, room queue and roles, stream IDs, chat messages, and peer information are not persisted.

Ignore rules are local to the browser and use the stable user ID rather than the changeable display name. They apply independently to chat plus Sharepad, links plus streams, and YouTube control. A receiver-side link-and-stream ignore always wins, including for direct invitations. A sender's own ignore excludes that user from `Everyone`, but explicit selection can override only this sender-side exclusion. The YouTube rule affects the room only while its owner is the controller.

The user list and user menu use the same identity display: name, abbreviated stable user ID, `Web` or `VR`, followed by optional `YT` and exactly one VDO badge. `YT` means that the session is locally synchronized and shared YouTube content is loaded; pausing does not remove it. `VDO` means that the single embedded player reports a connected public source. `VDO priv.` means it reports a connected private direct stream. The badge remains while YouTube is selected, but unloaded list entries do not create a badge. Older clients can still interpret the generic VDO receiving flag. Chat senders remain names only. Clicking or right-clicking a user in the list or chat opens the same local rule menu.

## Security

- Received links are restricted to HTTP and HTTPS.
- Received links always require explicit confirmation.
- Received text is rendered through DOM text properties.
- Chat message length is limited to 1,000 characters.
- Private stream IDs use 128 bits of browser-generated randomness and are never included in snapshots, chat, activities, or visible source labels.
- Private stream IDs are sent only to selected peers whose current invitation policy permits the publisher.
- Invitation policies and ignore rules are cooperative, session-only mechanisms without server-side authorization.
- Public VDO.Ninja room sources are intentionally open to anyone who knows the case-sensitive room name or scene URL.
- Private stream IDs are capability secrets, not authentication, authorization, or DRM.
- Room IDs are limited to 1–49 ASCII letters or digits and are shared unchanged between the Hub and VDO.Ninja.
- YouTube control, takeover locking, and ignore rules are cooperative room behavior, not an access-control boundary.
- YouTube entry metadata and queue payloads are length-limited and validated before display or synchronization.
- The default room ID is public and is not an access-control mechanism.
