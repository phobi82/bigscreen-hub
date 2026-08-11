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

const strategyUrl = STRATEGY_URLS[NETWORK_STRATEGY];

if (!strategyUrl) {
	throw new Error("Unsupported network strategy: " + NETWORK_STRATEGY);
}

const {getRelaySockets, joinRoom, selfId} = await import(strategyUrl);

export {selfId};

export function createRoomConnection(roomId, handlers) {
	let syncTimer = 0;
	let relayStatusTimer = 0;
	let relayReady = null;
	let active = true;
	const room = joinRoom(ROOM_CONFIG, roomId, {
		onJoinError: details => handlers.onError(details.error)
	});
	const padAction = room.makeAction("pad");
	const streamAction = room.makeAction("stream");
	const stateRequestAction = room.makeAction("stateRequest", {
		kind: "request",
		onRequest: () => handlers.getState()
	});
	const navigateAction = room.makeAction("navigate");
	const chatAction = room.makeAction("chat");
	const activityAction = room.makeAction("activity");
	const profileAction = room.makeAction("profile");

	const reportPresence = () => handlers.onPresence(Object.keys(room.getPeers()).length);
	const reportRelayStatus = () => {
		if (!active) return;
		const ready = Object.values(getRelaySockets()).some(socket => socket.readyState === WebSocket.OPEN);
		if (ready === relayReady) return;
		relayReady = ready;
		handlers.onRelayStatus(ready);
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

	room.onPeerJoin = () => {
		reportPresence();
		scheduleSynchronization();
		handlers.onPeerJoin?.();
	};
	room.onPeerLeave = peerId => {
		reportPresence();
		handlers.onPeerLeave?.(peerId);
	};
	padAction.onMessage = (state, {peerId}) => handlers.onPad(state, peerId);
	streamAction.onMessage = (state, {peerId}) => handlers.onStream(state, peerId);
	navigateAction.onMessage = (payload, {peerId}) => handlers.onNavigate(payload, peerId);
	chatAction.onMessage = (message, {peerId}) => handlers.onChat(message, peerId);
	activityAction.onMessage = (activity, {peerId}) => handlers.onActivity(activity, peerId);
	profileAction.onMessage = (profile, {peerId}) => handlers.onProfile(profile, peerId);
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
		leave() {
			active = false;
			clearInterval(relayStatusTimer);
			clearTimeout(syncTimer);
			room.leave();
		}
	};
}
