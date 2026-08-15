// SPDX-License-Identifier: MIT
/*
MIT License

Copyright (c) 2026 Phobi82

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

const NETWORK_STRATEGY = "mqtt"; // "nostr", "mqtt", or "torrent"
const STRATEGY_URLS = {
	nostr: "https://esm.run/trystero@0.25.3",
	mqtt: "https://esm.run/@trystero-p2p/mqtt@0.25.3",
	torrent: "https://esm.run/@trystero-p2p/torrent@0.25.3"
};
const ROOM_CONFIG = {appId: "bigscreen-stream-center"};
const RELAY_STATUS_POLL_MS = 500;
const SYNC_DELAY_MS = 120;
const SYNC_TIMEOUT_MS = 1500;
const REJOIN_DISCOVERY_DELAY_MS = 5000;
const REJOIN_BASE_DELAY_MS = 1000;
const REJOIN_MAX_DELAY_MS = 4000;
const REJOIN_MAX_ATTEMPTS = 3;
const REJOIN_JITTER_MS = 1000;
const REJOIN_LEAVE_DELAY_MS = 250;

const strategyUrl = STRATEGY_URLS[NETWORK_STRATEGY];

if (!strategyUrl) {
	throw new Error("Unsupported network strategy: " + NETWORK_STRATEGY);
}

const {getRelaySockets, joinRoom, selfId} = await import(strategyUrl);

export {selfId};

export function createRoomConnection(roomId, handlers) {
	let syncTimer = 0;
	let relayStatusTimer = 0;
	let rejoinTimer = 0;
	let rejoinAttempts = 0;
	let roomGeneration = 0;
	let relayReady = null;
	let active = true;
	let room = null;
	let padAction;
	let streamAction;
	let stateRequestAction;
	let navigateAction;
	let chatAction;
	let activityAction;
	let profileAction;
	let youtubeAction;
	const rejoinJitter = [...selfId].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 0) % REJOIN_JITTER_MS;

	const reportPresence = () => handlers.onPresence(Object.keys(room.getPeers()).length);
	const reportRelayStatus = () => {
		if (!active) return;
		const ready = Object.values(getRelaySockets()).some(socket => socket.readyState === WebSocket.OPEN);
		if (ready === relayReady) return;
		const wasReady = relayReady;
		relayReady = ready;
		handlers.onRelayStatus(ready);
		if (ready && !Object.keys(room.getPeers()).length) {
			if (wasReady === false) rejoinAttempts = 0;
			scheduleRejoin(REJOIN_DISCOVERY_DELAY_MS);
		}
	};

	const synchronize = async () => {
		const targets = Object.keys(room.getPeers());
		if (!active || targets.length === 0) {
			return;
		}

		try {
			const results = await stateRequestAction.requestMany(null, {
				targets,
				timeoutMs: SYNC_TIMEOUT_MS
			});
			for (const result of results) {
				if (result.status === "fulfilled") {
					handlers.onState(result.value);
				}
			}
		} catch (error) {
			handlers.onError(error);
		}
	};

	const scheduleSynchronization = () => {
		clearTimeout(syncTimer);
		syncTimer = window.setTimeout(synchronize, SYNC_DELAY_MS);
	};

	function scheduleRejoin(minimumDelay = 0) {
		// Recreate the room when discovery or peer negotiation stalls.
		if (!active || rejoinTimer || Object.keys(room?.getPeers() || {}).length || rejoinAttempts >= REJOIN_MAX_ATTEMPTS) return;
		const delay = Math.max(minimumDelay, Math.min(REJOIN_BASE_DELAY_MS * 2 ** rejoinAttempts, REJOIN_MAX_DELAY_MS)) + rejoinJitter;
		rejoinAttempts += 1;
		rejoinTimer = window.setTimeout(() => {
			if (!active || Object.keys(room?.getPeers() || {}).length) return;
			roomGeneration += 1;
			room.leave();
			rejoinTimer = window.setTimeout(() => {
				rejoinTimer = 0;
				if (!active) return;
				connectRoom(false);
				reportPresence();
			}, REJOIN_LEAVE_DELAY_MS);
		}, delay);
	}

	function connectRoom(leaveExistingRoom = true) {
		clearTimeout(syncTimer);
		syncTimer = 0;
		if (leaveExistingRoom) room?.leave();
		const generation = ++roomGeneration;
		room = joinRoom(ROOM_CONFIG, roomId, {
			onJoinError: details => {
				if (!active || generation !== roomGeneration) return;
				handlers.onError(details.error);
				scheduleRejoin();
			}
		});
		padAction = room.makeAction("pad");
		streamAction = room.makeAction("stream");
		stateRequestAction = room.makeAction("stateRequest", {
			kind: "request",
			onRequest: () => handlers.getState()
		});
		navigateAction = room.makeAction("navigate");
		chatAction = room.makeAction("chat");
		activityAction = room.makeAction("activity");
		profileAction = room.makeAction("profile");
		youtubeAction = room.makeAction("youtube");
		room.onPeerJoin = () => {
			if (generation !== roomGeneration) return;
			clearTimeout(rejoinTimer);
			rejoinTimer = 0;
			rejoinAttempts = 0;
			reportPresence();
			scheduleSynchronization();
			handlers.onPeerJoin?.();
		};
		room.onPeerLeave = peerId => {
			if (generation !== roomGeneration) return;
			reportPresence();
			handlers.onPeerLeave?.(peerId);
		};
		padAction.onMessage = (state, {peerId}) => generation === roomGeneration && handlers.onPad(state, peerId);
		streamAction.onMessage = (state, {peerId}) => generation === roomGeneration && handlers.onStream(state, peerId);
		navigateAction.onMessage = (payload, {peerId}) => generation === roomGeneration && handlers.onNavigate(payload, peerId);
		chatAction.onMessage = (message, {peerId}) => generation === roomGeneration && handlers.onChat(message, peerId);
		activityAction.onMessage = (activity, {peerId}) => generation === roomGeneration && handlers.onActivity(activity, peerId);
		profileAction.onMessage = (profile, {peerId}) => generation === roomGeneration && handlers.onProfile(profile, peerId);
		youtubeAction.onMessage = (message, {peerId}) => generation === roomGeneration && handlers.onYouTube(message, peerId);
		if (relayReady) scheduleRejoin(REJOIN_DISCOVERY_DELAY_MS);
	}

	connectRoom();
	reportPresence();
	window.queueMicrotask(reportRelayStatus);
	relayStatusTimer = window.setInterval(reportRelayStatus, RELAY_STATUS_POLL_MS);

	return {
		sendPad: state => padAction.send(state),
		sendStream: state => streamAction.send(state),
		sendNavigate: payload => navigateAction.send(payload),
		sendChat: message => chatAction.send(message),
		sendActivity: activity => activityAction.send(activity),
		sendProfile: profile => profileAction.send(profile),
		sendYouTube: (message, targets) => targets ? youtubeAction.send(message, targets) : youtubeAction.send(message),
		getPeerIds: () => Object.keys(room.getPeers()),
		leave() {
			active = false;
			roomGeneration += 1;
			clearInterval(relayStatusTimer);
			clearTimeout(syncTimer);
			clearTimeout(rejoinTimer);
			room.leave();
		}
	};
}
