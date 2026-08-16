import { RoomServiceClient } from "livekit-server-sdk";

function getRoomService() {
  const serverUrl = process.env.LIVEKIT_URL?.trim();
  const apiKey = process.env.LIVEKIT_API_KEY?.trim();
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();

  if (!serverUrl || !apiKey || !apiSecret) {
    throw new Error("LiveKit configuration is missing");
  }

  const apiUrl = serverUrl
    .replace(/^wss:/, "https:")
    .replace(/^ws:/, "http:");
  return new RoomServiceClient(apiUrl, apiKey, apiSecret);
}

export function createAvalonVoiceRoom(gameId) {
  return getRoomService().createRoom({
    name: `avalon-${gameId}`,
    emptyTimeout: 6 * 60 * 60,
    departureTimeout: 5 * 60,
    metadata: JSON.stringify({ gameId, kind: "avalon" }),
  });
}

export function removeAvalonVoiceParticipant(gameId, userId) {
  return getRoomService().removeParticipant(`avalon-${gameId}`, userId, {
    revokeTokenTs: BigInt(Math.floor(Date.now() / 1000) + 1),
  });
}
