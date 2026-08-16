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

type SpeakingMonitor = {
  source: MediaStreamAudioSourceNode;
  analyser: AnalyserNode;
  samples: Uint8Array<ArrayBuffer>;
  lastVoiceAt: number;
};

const defaultStunUrl = "stun:stun.l.google.com:19302";
const speakingThreshold = 0.035;
const speakingHoldMilliseconds = 300;

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
  const [speakingUserIds, setSpeakingUserIds] = useState<string[]>([]);
  const [isPlaybackBlocked, setIsPlaybackBlocked] = useState(false);
  const [iceConfiguration, setIceConfiguration] = useState<{
    gameId: string;
    servers: RTCIceServer[];
  } | null>(null);
  const peersRef = useRef(new Map<string, VoicePeer>());
  const localStreamRef = useRef<MediaStream | null>(null);
  const activeGameIdRef = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const speakingMonitorsRef = useRef(new Map<string, SpeakingMonitor>());
  const speakingFrameRef = useRef<number | null>(null);
  const enabled = Boolean(
    game &&
      game.status === "inProgress" &&
      currentUserId &&
      game.seats.some((seat) => seat.player?.id === currentUserId),
  );

  const ensureSpeakingLoop = useCallback(() => {
    if (speakingFrameRef.current !== null) return;

    const sampleAudioLevels = () => {
      const now = performance.now();
      const activeSpeakers: string[] = [];

      for (const [userId, monitor] of speakingMonitorsRef.current) {
        monitor.analyser.getByteTimeDomainData(monitor.samples);
        let sumOfSquares = 0;
        for (const sample of monitor.samples) {
          const normalizedSample = (sample - 128) / 128;
          sumOfSquares += normalizedSample * normalizedSample;
        }
        const volume = Math.sqrt(sumOfSquares / monitor.samples.length);
        if (volume >= speakingThreshold) monitor.lastVoiceAt = now;
        if (now - monitor.lastVoiceAt <= speakingHoldMilliseconds) {
          activeSpeakers.push(userId);
        }
      }

      activeSpeakers.sort();
      setSpeakingUserIds((current) => {
        if (
          current.length === activeSpeakers.length &&
          current.every((userId, index) => userId === activeSpeakers[index])
        ) {
          return current;
        }
        return activeSpeakers;
      });

      if (speakingMonitorsRef.current.size > 0) {
        speakingFrameRef.current = requestAnimationFrame(sampleAudioLevels);
      } else {
        speakingFrameRef.current = null;
      }
    };

    speakingFrameRef.current = requestAnimationFrame(sampleAudioLevels);
  }, []);

  const stopSpeakingMonitor = useCallback((userId: string) => {
    const monitor = speakingMonitorsRef.current.get(userId);
    if (!monitor) return;
    monitor.source.disconnect();
    monitor.analyser.disconnect();
    speakingMonitorsRef.current.delete(userId);
    setSpeakingUserIds((current) => current.filter((id) => id !== userId));

    if (speakingMonitorsRef.current.size === 0 && speakingFrameRef.current !== null) {
      cancelAnimationFrame(speakingFrameRef.current);
      speakingFrameRef.current = null;
    }
  }, []);

  const startSpeakingMonitor = useCallback(
    (userId: string, stream: MediaStream) => {
      if (!stream.getAudioTracks().length || typeof AudioContext === "undefined") {
        return;
      }

      stopSpeakingMonitor(userId);
      const audioContext = audioContextRef.current ?? new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.65;
      source.connect(analyser);
      speakingMonitorsRef.current.set(userId, {
        source,
        analyser,
        samples: new Uint8Array(analyser.fftSize),
        lastVoiceAt: 0,
      });
      void audioContext.resume().catch(() => {});
      ensureSpeakingLoop();
    },
    [ensureSpeakingLoop, stopSpeakingMonitor],
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
        setError(
          "اتصال پشتیبان صوتی آماده نشد؛ اتصال مستقیم در حال امتحان است.",
        );
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
        peer.remoteAudio.remove();
      }
      stopSpeakingMonitor(peerId);
      peersRef.current.delete(peerId);
      updateConnectedPeerCount();
    },
    [stopSpeakingMonitor, updateConnectedPeerCount],
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
        audio.hidden = true;
        audio.muted = false;
        audio.volume = 1;
        audio.srcObject = stream;
        peer.remoteAudio = audio;
        if (!audio.isConnected) document.body.appendChild(audio);
        startSpeakingMonitor(peerId, stream);
        void audio.play().then(
          () => {},
          () => setIsPlaybackBlocked(true),
        );
      };
      connection.onconnectionstatechange = () => {
        updateConnectedPeerCount();
        if (connection.connectionState === "failed") {
          connection.restartIce();
        }
      };

      return peer;
    },
    [
      iceConfiguration,
      startSpeakingMonitor,
      transport,
      updateConnectedPeerCount,
    ],
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
      for (const userId of Array.from(speakingMonitorsRef.current.keys())) {
        stopSpeakingMonitor(userId);
      }
      setIsMuted(true);
      setError(null);
      setIsPlaybackBlocked(Boolean(nextGameId));
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
    stopSpeakingMonitor,
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
        peer.remoteAudio?.remove();
      }
      peersRef.current.clear();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      if (speakingFrameRef.current !== null) {
        cancelAnimationFrame(speakingFrameRef.current);
        speakingFrameRef.current = null;
      }
      for (const monitor of speakingMonitorsRef.current.values()) {
        monitor.source.disconnect();
        monitor.analyser.disconnect();
      }
      speakingMonitorsRef.current.clear();
      void audioContextRef.current?.close();
      audioContextRef.current = null;
    },
    [],
  );

  const unlockAudio = useCallback(async () => {
    try {
      if (audioContextRef.current?.state === "suspended") {
        await audioContextRef.current.resume();
      }

      const results = await Promise.allSettled(
        Array.from(peersRef.current.values()).map((peer) =>
          peer.remoteAudio?.play(),
        ),
      );
      const playbackFailed = results.some(
        (result) => result.status === "rejected",
      );
      setIsPlaybackBlocked(playbackFailed);
    } catch {
      setIsPlaybackBlocked(true);
    }
  }, []);

  const toggleMuted = useCallback(async () => {
    if (!enabled || isRequestingPermission) return;

    await unlockAudio();

    if (!isMuted) {
      setIsMuted(true);
      setIsRequestingPermission(true);
      const stream = localStreamRef.current;
      localStreamRef.current = null;
      const tracks = stream?.getAudioTracks() ?? [];
      tracks.forEach((track) => (track.enabled = false));
      if (currentUserId) stopSpeakingMonitor(currentUserId);

      try {
        await Promise.allSettled(
          Array.from(peersRef.current.values()).map(async (peer) => {
            const sender = peer.connection
              .getSenders()
              .find((candidate) => candidate.track?.kind === "audio") ??
              peer.connection.getTransceivers()[0]?.sender;
            if (sender) await sender.replaceTrack(null);
          }),
        );
      } finally {
        tracks.forEach((track) => track.stop());
        setIsRequestingPermission(false);
      }
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
      if (currentUserId) startSpeakingMonitor(currentUserId, stream);

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
  }, [
    currentUserId,
    enabled,
    isMuted,
    isRequestingPermission,
    startSpeakingMonitor,
    stopSpeakingMonitor,
    unlockAudio,
  ]);

  return {
    enabled,
    isSupported:
      typeof RTCPeerConnection !== "undefined" &&
      typeof navigator !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia),
    isMuted,
    isRequestingPermission,
    connectedPeerCount,
    speakingUserIds,
    isPlaybackBlocked,
    error,
    unlockAudio,
    toggleMuted,
  };
}
