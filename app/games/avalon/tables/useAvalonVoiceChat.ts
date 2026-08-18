"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  isBrowserSupported,
  Room,
  RoomEvent,
  Track,
  type Participant,
  type RemoteParticipant,
  type RemoteTrack,
  type RemoteTrackPublication,
} from "livekit-client";

import type { ApiResponseBody } from "@/lib/api-response";
import type { AvalonWsGame } from "./types";

type LiveKitConnection = {
  serverUrl: string;
  participantToken: string;
};

const microphoneOptions = {
  autoGainControl: true,
  echoCancellation: true,
  noiseSuppression: true,
};

export function useAvalonVoiceChat({
  game,
  currentUserId,
}: {
  game: AvalonWsGame | null;
  currentUserId: string | null;
}) {
  const [isMuted, setIsMuted] = useState(true);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [connectedPeerCount, setConnectedPeerCount] = useState(0);
  const [speakingUserIds, setSpeakingUserIds] = useState<string[]>([]);
  const [isPlaybackBlocked, setIsPlaybackBlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const roomRef = useRef<Room | null>(null);

  const isSupported = useMemo(
    () => typeof window !== "undefined" && isBrowserSupported(),
    [],
  );
  const enabled = Boolean(
    isSupported &&
      (game?.status === "lobby" ||
        game?.status === "inProgress" ||
        game?.status === "completed") &&
      currentUserId &&
      game.seats.some((seat) => seat.player?.id === currentUserId),
  );

  useEffect(() => {
    if (!enabled || !game?.id) {
      setIsMuted(true);
      setConnectedPeerCount(0);
      setSpeakingUserIds([]);
      setIsPlaybackBlocked(false);
      return;
    }

    const controller = new AbortController();
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;

    const updateParticipantCount = () => {
      setConnectedPeerCount(room.remoteParticipants.size);
    };
    const handleTrackSubscribed = (
      track: RemoteTrack,
      _publication: RemoteTrackPublication,
      _participant: RemoteParticipant,
    ) => {
      if (track.kind !== Track.Kind.Audio) return;
      const audio = track.attach();
      audio.autoplay = true;
      audio.setAttribute("playsinline", "");
      audio.hidden = true;
      document.body.appendChild(audio);
      void audio.play().catch(() => setIsPlaybackBlocked(true));
    };
    const handleTrackUnsubscribed = (track: RemoteTrack) => {
      track.detach().forEach((element) => element.remove());
    };
    const handleActiveSpeakersChanged = (speakers: Participant[]) => {
      setSpeakingUserIds(speakers.map((speaker) => speaker.identity));
    };
    const handleAudioPlaybackStatusChanged = () => {
      setIsPlaybackBlocked(!room.canPlaybackAudio);
    };
    const handleDisconnected = () => {
      setConnectedPeerCount(0);
      setSpeakingUserIds([]);
      setIsMuted(true);
    };

    room
      .on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
      .on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
      .on(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakersChanged)
      .on(RoomEvent.ParticipantConnected, updateParticipantCount)
      .on(RoomEvent.ParticipantDisconnected, updateParticipantCount)
      .on(RoomEvent.AudioPlaybackStatusChanged, handleAudioPlaybackStatusChanged)
      .on(RoomEvent.Disconnected, handleDisconnected);

    void (async () => {
      try {
        const response = await fetch("/api/games/avalon/livekit-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameId: game.id }),
          cache: "no-store",
          signal: controller.signal,
        });
        const result =
          (await response.json()) as ApiResponseBody<LiveKitConnection | null>;

        if (!response.ok || !result.data) throw new Error(result.message);

        await room.connect(
          result.data.serverUrl,
          result.data.participantToken,
          { autoSubscribe: true },
        );
        if (controller.signal.aborted) {
          await room.disconnect();
          return;
        }

        setError(null);
        setIsMuted(true);
        updateParticipantCount();
        setIsPlaybackBlocked(!room.canPlaybackAudio);
      } catch (connectionError) {
        if (controller.signal.aborted) return;
        console.error("Failed to connect to Avalon LiveKit room", connectionError);
        setError("اتصال به گفت‌وگوی صوتی برقرار نشد. تنظیمات LiveKit را بررسی کنید.");
      }
    })();

    return () => {
      controller.abort();
      if (roomRef.current === room) roomRef.current = null;
      for (const participant of room.remoteParticipants.values()) {
        for (const publication of participant.trackPublications.values()) {
          publication.track?.detach().forEach((element) => element.remove());
        }
      }
      room
        .off(RoomEvent.TrackSubscribed, handleTrackSubscribed)
        .off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
        .off(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakersChanged)
        .off(RoomEvent.ParticipantConnected, updateParticipantCount)
        .off(RoomEvent.ParticipantDisconnected, updateParticipantCount)
        .off(RoomEvent.AudioPlaybackStatusChanged, handleAudioPlaybackStatusChanged)
        .off(RoomEvent.Disconnected, handleDisconnected);
      void room.disconnect();
    };
  }, [enabled, game?.id]);

  const unlockAudio = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    try {
      await room.startAudio();
      setIsPlaybackBlocked(!room.canPlaybackAudio);
    } catch {
      setIsPlaybackBlocked(true);
    }
  }, []);

  const toggleMuted = useCallback(async () => {
    const room = roomRef.current;
    if (!enabled || !room || isRequestingPermission) return;

    setIsRequestingPermission(true);
    setError(null);
    try {
      await room.startAudio();
      const shouldEnable = isMuted;
      await room.localParticipant.setMicrophoneEnabled(
        shouldEnable,
        shouldEnable ? microphoneOptions : undefined,
      );
      setIsMuted(!shouldEnable);
      setIsPlaybackBlocked(!room.canPlaybackAudio);
    } catch (microphoneError) {
      console.error("Failed to change Avalon microphone state", microphoneError);
      setIsMuted(true);
      setError("دسترسی میکروفن داده نشد. اجازه میکروفن مرورگر را بررسی کنید.");
    } finally {
      setIsRequestingPermission(false);
    }
  }, [enabled, isMuted, isRequestingPermission]);

  return {
    enabled,
    isSupported,
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
