"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ApiResponseBody } from "@/lib/api-response";
import type { AvalonWsGame, AvalonVoiceSignal, ConnectionStatus } from "./types";

type VoiceTransport = {
  sendSignal: (
    gameId: string,
    targetUserId: string,
    signal: AvalonVoiceSignal,
  ) => boolean;
  subscribe: (
    listener: (fromUserId: string, signal: AvalonVoiceSignal) => void,
  ) => () => void;
};

type VoicePeer = {
  connection: RTCPeerConnection;
  remoteAudio: HTMLAudioElement | null;
  pendingCandidates: RTCIceCandidateInit[];
  isOffering: boolean;
  hasOffered: boolean;
};

const defaultStunUrl = "stun:stun.l.google.com:19302";

const fallbackIceServers: RTCIceServer[] = [
  { urls: process.env.NEXT_PUBLIC_AVALON_STUN_URL || defaultStunUrl },
];

export function useAvalonVoiceChat({
  game,
  participantIds,
  currentUserId,
  connectionStatus,
  transport,
}: {
  game: AvalonWsGame | null;
  participantIds: string[];
  currentUserId: string | null;
  connectionStatus: ConnectionStatus;
  transport: VoiceTransport;
}) {
  const [isMuted, setIsMuted] = useState(true);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectedPeerCount, setConnectedPeerCount] = useState(0);
  const [iceConfiguration, setIceConfiguration] = useState<{
    gameId: string;
    servers: RTCIceServer[];
  } | null>(null);
  const peersRef = useRef(new Map<string, VoicePeer>());
  const localStreamRef = useRef<MediaStream | null>(null);
  const activeGameIdRef = useRef<string | null>(null);
  const enabled = Boolean(
    game &&
      game.status === "inProgress" &&
      currentUserId &&
      game.seats.some((seat) => seat.player?.id === currentUserId),
  );

  useEffect(() => {
    if (!enabled || !game?.id) {
      setIceConfiguration(null);
      return;
    }

    const gameId = game.id;
    const controller = new AbortController();

    void (async () => {
      try {
        const response = await fetch("/api/games/avalon/turn-credentials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameId }),
          cache: "no-store",
          signal: controller.signal,
        });
        const result =
          (await response.json()) as ApiResponseBody<RTCIceServer[] | null>;

        if (!response.ok || !Array.isArray(result.data) || !result.data.length) {
          throw new Error(result.message);
        }

        setIceConfiguration({ gameId, servers: result.data });
      } catch (requestError) {
        if (controller.signal.aborted) return;
        console.error("Failed to load temporary TURN credentials", requestError);
        setIceConfiguration({ gameId, servers: fallbackIceServers });
      }
    })();

    return () => controller.abort();
  }, [enabled, game?.id]);

  const updateConnectedPeerCount = useCallback(() => {
    setConnectedPeerCount(
      Array.from(peersRef.current.values()).filter(
        (peer) => peer.connection.connectionState === "connected",
      ).length,
    );
  }, []);

  const closePeer = useCallback(
    (peerId: string) => {
      const peer = peersRef.current.get(peerId);
      if (!peer) return;

      peer.connection.onicecandidate = null;
      peer.connection.ontrack = null;
      peer.connection.onconnectionstatechange = null;
      peer.connection.close();
      if (peer.remoteAudio) {
        peer.remoteAudio.pause();
        peer.remoteAudio.srcObject = null;
      }
      peersRef.current.delete(peerId);
      updateConnectedPeerCount();
    },
    [updateConnectedPeerCount],
  );

  const getOrCreatePeer = useCallback(
    (peerId: string) => {
      const existingPeer = peersRef.current.get(peerId);
      if (existingPeer) return existingPeer;
      if (
        !activeGameIdRef.current ||
        iceConfiguration?.gameId !== activeGameIdRef.current ||
        typeof RTCPeerConnection === "undefined"
      ) {
        return null;
      }

      const connection = new RTCPeerConnection({
        iceServers: iceConfiguration.servers,
      });
      const transceiver = connection.addTransceiver("audio", {
        direction: "sendrecv",
      });
      const localTrack = localStreamRef.current?.getAudioTracks()[0] ?? null;
      if (localTrack) void transceiver.sender.replaceTrack(localTrack);

      const peer: VoicePeer = {
        connection,
        remoteAudio: null,
        pendingCandidates: [],
        isOffering: false,
        hasOffered: false,
      };
      peersRef.current.set(peerId, peer);

      connection.onicecandidate = (event) => {
        const gameId = activeGameIdRef.current;
        if (gameId && event.candidate) {
          transport.sendSignal(gameId, peerId, {
            candidate: event.candidate.toJSON(),
          });
        }
      };
      connection.ontrack = (event) => {
        const stream = event.streams[0] ?? new MediaStream([event.track]);
        const audio = peer.remoteAudio ?? new Audio();
        audio.autoplay = true;
        audio.setAttribute("playsinline", "");
        audio.srcObject = stream;
        peer.remoteAudio = audio;
        void audio.play().catch(() => {
          // The next microphone-button click also retries remote playback.
        });
      };
      connection.onconnectionstatechange = () => {
        updateConnectedPeerCount();
        if (connection.connectionState === "failed") {
          connection.restartIce();
        }
      };

      return peer;
    },
    [iceConfiguration, transport, updateConnectedPeerCount],
  );

  const sendOffer = useCallback(
    async (peerId: string) => {
      const peer = getOrCreatePeer(peerId);
      const gameId = activeGameIdRef.current;
      if (!peer || !gameId || peer.isOffering || peer.hasOffered) return;

      peer.isOffering = true;
      peer.hasOffered = true;
      try {
        const offer = await peer.connection.createOffer();
        await peer.connection.setLocalDescription(offer);
        if (peer.connection.localDescription) {
          transport.sendSignal(gameId, peerId, {
            description: peer.connection.localDescription.toJSON(),
          });
        }
      } catch {
        closePeer(peerId);
      } finally {
        peer.isOffering = false;
      }
    },
    [closePeer, getOrCreatePeer, transport],
  );

  useEffect(() => {
    const nextGameId = enabled ? (game?.id ?? null) : null;
    if (activeGameIdRef.current !== nextGameId) {
      for (const peerId of Array.from(peersRef.current.keys())) {
        closePeer(peerId);
      }
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      setIsMuted(true);
      setError(null);
    }
    activeGameIdRef.current = nextGameId;

    if (!enabled || connectionStatus !== "connected" || !currentUserId) {
      for (const peerId of Array.from(peersRef.current.keys())) {
        closePeer(peerId);
      }
      return;
    }

    const activePeerIds = new Set(
      participantIds.filter((participantId) => participantId !== currentUserId),
    );

    for (const peerId of Array.from(peersRef.current.keys())) {
      if (!activePeerIds.has(peerId)) closePeer(peerId);
    }

    for (const peerId of activePeerIds) {
      getOrCreatePeer(peerId);
      if (currentUserId.localeCompare(peerId) < 0) void sendOffer(peerId);
    }
  }, [
    closePeer,
    connectionStatus,
    currentUserId,
    enabled,
    game?.id,
    getOrCreatePeer,
    participantIds,
    sendOffer,
  ]);

  useEffect(
    () =>
      transport.subscribe((fromUserId, signal) => {
        if (!enabled || !participantIds.includes(fromUserId)) return;

        void (async () => {
          const peer = getOrCreatePeer(fromUserId);
          const gameId = activeGameIdRef.current;
          if (!peer || !gameId) return;

          try {
            if (signal.description) {
              await peer.connection.setRemoteDescription(signal.description);
              for (const candidate of peer.pendingCandidates.splice(0)) {
                await peer.connection.addIceCandidate(candidate);
              }

              if (signal.description.type === "offer") {
                const answer = await peer.connection.createAnswer();
                await peer.connection.setLocalDescription(answer);
                if (peer.connection.localDescription) {
                  transport.sendSignal(gameId, fromUserId, {
                    description: peer.connection.localDescription.toJSON(),
                  });
                }
              }
            } else if (signal.candidate) {
              if (peer.connection.remoteDescription) {
                await peer.connection.addIceCandidate(signal.candidate);
              } else {
                peer.pendingCandidates.push(signal.candidate);
              }
            }
          } catch {
            closePeer(fromUserId);
          }
        })();
      }),
    [
      closePeer,
      enabled,
      getOrCreatePeer,
      participantIds,
      transport,
    ],
  );

  useEffect(() => {
    if (enabled) return;

    setIsMuted(true);
    setError(null);
    const stream = localStreamRef.current;
    localStreamRef.current = null;
    stream?.getTracks().forEach((track) => track.stop());
  }, [enabled]);

  useEffect(
    () => () => {
      for (const peer of peersRef.current.values()) {
        peer.connection.close();
        peer.remoteAudio?.pause();
      }
      peersRef.current.clear();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    },
    [],
  );

  const toggleMuted = useCallback(async () => {
    if (!enabled || isRequestingPermission) return;

    for (const peer of peersRef.current.values()) {
      void peer.remoteAudio?.play().catch(() => {});
    }

    if (!isMuted) {
      localStreamRef.current
        ?.getAudioTracks()
        .forEach((track) => (track.enabled = false));
      setIsMuted(true);
      return;
    }

    setIsRequestingPermission(true);
    setError(null);
    try {
      let stream = localStreamRef.current;
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });
        localStreamRef.current = stream;
      }

      const track = stream.getAudioTracks()[0];
      if (!track) throw new Error("No microphone track");
      track.enabled = true;

      await Promise.all(
        Array.from(peersRef.current.values()).map(async (peer) => {
          const sender = peer.connection
            .getSenders()
            .find((candidate) => candidate.track?.kind === "audio") ??
            peer.connection.getTransceivers()[0]?.sender;
          if (sender) await sender.replaceTrack(track);
        }),
      );
      setIsMuted(false);
    } catch {
      setIsMuted(true);
      setError("دسترسی میکروفن داده نشد. اجازه میکروفن مرورگر را بررسی کنید.");
    } finally {
      setIsRequestingPermission(false);
    }
  }, [enabled, isMuted, isRequestingPermission]);

  return {
    enabled,
    isSupported:
      typeof RTCPeerConnection !== "undefined" &&
      typeof navigator !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia),
    isMuted,
    isRequestingPermission,
    connectedPeerCount,
    error,
    toggleMuted,
  };
}
