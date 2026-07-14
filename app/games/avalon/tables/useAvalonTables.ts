import { useEffect, useRef, useState } from "react";

import { getAvalonWsUrl } from "./avalonTableUtils";
import type {
  AvalonWsGame,
  AvalonWsMessage,
  AvalonWsSeat,
  AvalonTableSnapshot,
  AvalonWsUser,
  ConnectionStatus,
} from "./types";

const MESSAGE_VISIBLE_MS = 4000;
const FAST_RECONNECT_ATTEMPTS = 5;
const FAST_RECONNECT_INTERVAL_MS = 2000;
const RECONNECT_INTERVAL_MS = 10000;
const ACTION_TIMEOUT_MS = 5000;
const SOCKET_UNAVAILABLE_MESSAGE = "اتصال وب‌سوکت فعال نیست.";

export function useAvalonTables(tableId?: string) {
  const [wsUser, setWsUser] = useState<AvalonWsUser | null>(null);
  const [games, setGames] = useState<AvalonWsGame[]>([]);
  const [tableSnapshot, setTableSnapshot] =
    useState<AvalonTableSnapshot | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cancellingGameId, setCancellingGameId] = useState<string | null>(null);
  const [startingGameId, setStartingGameId] = useState<string | null>(null);
  const [selectedSeatByGame, setSelectedSeatByGame] = useState<
    Record<string, string | null>
  >({});
  const [selectedTeamSeatsByQuest, setSelectedTeamSeatsByQuest] = useState<
    Record<string, string[]>
  >({});
  const [selectedLadyTargetByCheck, setSelectedLadyTargetByCheck] = useState<
    Record<string, string | null>
  >({});
  const [
    selectedAssassinTargetByAssassination,
    setSelectedAssassinTargetByAssassination,
  ] = useState<Record<string, string | null>>({});
  const [pendingSeatGameId, setPendingSeatGameId] = useState<string | null>(null);
  const [pendingNominationQuestId, setPendingNominationQuestId] = useState<
    string | null
  >(null);
  const [pendingDecisionQuestId, setPendingDecisionQuestId] = useState<
    string | null
  >(null);
  const [pendingMissionVoteId, setPendingMissionVoteId] = useState<
    string | null
  >(null);
  const [pendingLadyTargetId, setPendingLadyTargetId] = useState<string | null>(
    null,
  );
  const [pendingAssassinActionId, setPendingAssassinActionId] = useState<
    string | null
  >(null);
  const [wsUrl, setWsUrl] = useState("در انتظار مرورگر");
  const [canCancelFromWs, setCanCancelFromWs] = useState(false);
  const [canStartFromWs, setCanStartFromWs] = useState(false);
  const [canChangeSeatFromWs, setCanChangeSeatFromWs] = useState(false);
  const [canNominateTeammatesFromWs, setCanNominateTeammatesFromWs] =
    useState(false);
  const [canNightAlreadyCheckFromWs, setCanNightAlreadyCheckFromWs] =
    useState(false);
  const [canQuestDecisionFromWs, setCanQuestDecisionFromWs] = useState(false);
  const [canMissionVoteFromWs, setCanMissionVoteFromWs] = useState(false);
  const [canLadyTargetFromWs, setCanLadyTargetFromWs] = useState(false);
  const [canAssassinActionFromWs, setCanAssassinActionFromWs] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const cancelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nightCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const nominationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const questDecisionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const missionVoteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const ladyTargetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const assassinActionTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!error && !notice) {
      return;
    }

    const timeout = setTimeout(() => {
      setError(null);
      setNotice(null);
    }, MESSAGE_VISIBLE_MS);

    return () => {
      clearTimeout(timeout);
    };
  }, [error, notice]);

  useEffect(() => {
    const url = getAvalonWsUrl(tableId);
    let shouldReconnect = true;
    let reconnectAttempts = 0;

    function clearReconnectTimeout() {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    }

    function scheduleReconnect() {
      if (!shouldReconnect || reconnectTimeoutRef.current) {
        return;
      }

      const reconnectInterval =
        reconnectAttempts < FAST_RECONNECT_ATTEMPTS
          ? FAST_RECONNECT_INTERVAL_MS
          : RECONNECT_INTERVAL_MS;
      reconnectAttempts += 1;

      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectTimeoutRef.current = null;

        if (shouldReconnect) {
          connect();
        }
      }, reconnectInterval);
    }

    function handleActionResult(message: AvalonWsMessage) {
      if (
        message.type !== "avalon.cancelGame.result" &&
        message.type !== "avalon.startGame.result" &&
        message.type !== "avalon.seat.result" &&
        message.type !== "avalon.nightAlreadyCheck.result" &&
        message.type !== "avalon.nominateTeammates.result" &&
        message.type !== "avalon.questDecision.result" &&
        message.type !== "avalon.missionVote.result" &&
        message.type !== "avalon.ladyTarget.result" &&
        message.type !== "avalon.assassinAction.result"
      ) {
        return;
      }

      if (message.type === "avalon.cancelGame.result") {
        if (cancelTimeoutRef.current) {
          clearTimeout(cancelTimeoutRef.current);
          cancelTimeoutRef.current = null;
        }

        setCancellingGameId(null);
      }

      if (message.type === "avalon.startGame.result") {
        if (startTimeoutRef.current) {
          clearTimeout(startTimeoutRef.current);
          startTimeoutRef.current = null;
        }

        setStartingGameId(null);
      }

      if (message.type === "avalon.seat.result") {
        if (seatTimeoutRef.current) {
          clearTimeout(seatTimeoutRef.current);
          seatTimeoutRef.current = null;
        }

        setPendingSeatGameId(null);

        if (message.data.ok && message.data.gameId) {
          setSelectedSeatByGame((current) => ({
            ...current,
            [message.data.gameId as string]: null,
          }));
        }
      }

      if (message.type === "avalon.nightAlreadyCheck.result") {
        if (nightCheckTimeoutRef.current) {
          clearTimeout(nightCheckTimeoutRef.current);
          nightCheckTimeoutRef.current = null;
        }
      }

      if (message.type === "avalon.nominateTeammates.result") {
        if (nominationTimeoutRef.current) {
          clearTimeout(nominationTimeoutRef.current);
          nominationTimeoutRef.current = null;
        }

        setPendingNominationQuestId(null);

        if (message.data.ok && message.data.questId) {
          setSelectedTeamSeatsByQuest((current) => ({
            ...current,
            [message.data.questId as string]: [],
          }));
        }
      }

      if (message.type === "avalon.questDecision.result") {
        if (questDecisionTimeoutRef.current) {
          clearTimeout(questDecisionTimeoutRef.current);
          questDecisionTimeoutRef.current = null;
        }

        setPendingDecisionQuestId(null);
      }

      if (message.type === "avalon.missionVote.result") {
        if (missionVoteTimeoutRef.current) {
          clearTimeout(missionVoteTimeoutRef.current);
          missionVoteTimeoutRef.current = null;
        }

        setPendingMissionVoteId(null);
      }

      if (message.type === "avalon.ladyTarget.result") {
        if (ladyTargetTimeoutRef.current) {
          clearTimeout(ladyTargetTimeoutRef.current);
          ladyTargetTimeoutRef.current = null;
        }

        setPendingLadyTargetId(null);

        if (message.data.ok && message.data.ladyCheckId) {
          setSelectedLadyTargetByCheck((current) => ({
            ...current,
            [message.data.ladyCheckId as string]: null,
          }));
        }
      }

      if (message.type === "avalon.assassinAction.result") {
        if (assassinActionTimeoutRef.current) {
          clearTimeout(assassinActionTimeoutRef.current);
          assassinActionTimeoutRef.current = null;
        }

        setPendingAssassinActionId(null);

        if (message.data.ok && message.data.assassinationId) {
          setSelectedAssassinTargetByAssassination((current) => ({
            ...current,
            [message.data.assassinationId as string]: null,
          }));
        }
      }

      setNotice(message.data.message);

      if (!message.data.ok) {
        setError(message.data.message);
      }
    }

    function connect() {
      const socket = new WebSocket(url);

      socketRef.current = socket;
      setWsUrl(url);
      setConnectionStatus("connecting");
      setCanCancelFromWs(false);
      setCanStartFromWs(false);
      setCanChangeSeatFromWs(false);
      setCanNominateTeammatesFromWs(false);
      setCanNightAlreadyCheckFromWs(false);
      setCanQuestDecisionFromWs(false);
      setCanMissionVoteFromWs(false);
      setCanLadyTargetFromWs(false);
      setCanAssassinActionFromWs(false);

      socket.addEventListener("open", () => {
        clearReconnectTimeout();
        reconnectAttempts = 0;
        setConnectionStatus("connected");
        setError(null);
        socket.send(JSON.stringify({ type: "refresh" }));
      });

      socket.addEventListener("message", (event) => {
        try {
          const message = JSON.parse(event.data) as AvalonWsMessage;

          if (message.type === "hello") {
            setWsUser(message.data.user ?? null);
            setCanCancelFromWs(
              message.data.capabilities?.includes("avalon.cancelGame") ?? false,
            );
            setCanStartFromWs(
              message.data.capabilities?.includes("avalon.startGame") ?? false,
            );
            setCanChangeSeatFromWs(
              (message.data.capabilities?.includes("avalon.joinSeat") &&
                message.data.capabilities?.includes("avalon.changeSeat") &&
                message.data.capabilities?.includes("avalon.leaveSeat")) ??
                false,
            );
            setCanNightAlreadyCheckFromWs(
              message.data.capabilities?.includes("avalon.nightAlreadyCheck") ??
                false,
            );
            setCanNominateTeammatesFromWs(
              message.data.capabilities?.includes(
                "avalon.nominateTeammates",
              ) ?? false,
            );
            setCanQuestDecisionFromWs(
              message.data.capabilities?.includes("avalon.questDecision") ??
                false,
            );
            setCanMissionVoteFromWs(
              message.data.capabilities?.includes("avalon.missionVote") ??
                false,
            );
            setCanLadyTargetFromWs(
              message.data.capabilities?.includes("avalon.ladyTarget") ??
                false,
            );
            setCanAssassinActionFromWs(
              message.data.capabilities?.includes("avalon.assassinAction") ??
                false,
            );
            return;
          }

          if (message.type === "avalon.games") {
            setGames(message.data);
            setLastUpdatedAt(message.sentAt);
            return;
          }

          if (message.type === "avalon.table") {
            setTableSnapshot(message.data);
            setLastUpdatedAt(message.sentAt);
            return;
          }

          if (message.type === "error") {
            setError(message.data.message);
            return;
          }

          handleActionResult(message);
        } catch {
          setError("پیام وب‌سوکت قابل خواندن نبود.");
        }
      });

      socket.addEventListener("close", () => {
        if (socketRef.current === socket) {
          socketRef.current = null;
        }

        setConnectionStatus("disconnected");
        scheduleReconnect();
      });

      socket.addEventListener("error", () => {
        setConnectionStatus("error");
        setError("اتصال به سرور وب‌سوکت آوالون انجام نشد.");
        scheduleReconnect();

        if (
          socket.readyState === WebSocket.CONNECTING ||
          socket.readyState === WebSocket.OPEN
        ) {
          socket.close();
        }
      });
    }

    connect();

    return () => {
      shouldReconnect = false;
      clearReconnectTimeout();

      if (cancelTimeoutRef.current) {
        clearTimeout(cancelTimeoutRef.current);
        cancelTimeoutRef.current = null;
      }

      if (seatTimeoutRef.current) {
        clearTimeout(seatTimeoutRef.current);
        seatTimeoutRef.current = null;
      }

      if (startTimeoutRef.current) {
        clearTimeout(startTimeoutRef.current);
        startTimeoutRef.current = null;
      }

      if (nightCheckTimeoutRef.current) {
        clearTimeout(nightCheckTimeoutRef.current);
        nightCheckTimeoutRef.current = null;
      }

      if (nominationTimeoutRef.current) {
        clearTimeout(nominationTimeoutRef.current);
        nominationTimeoutRef.current = null;
      }

      if (questDecisionTimeoutRef.current) {
        clearTimeout(questDecisionTimeoutRef.current);
        questDecisionTimeoutRef.current = null;
      }

      if (missionVoteTimeoutRef.current) {
        clearTimeout(missionVoteTimeoutRef.current);
        missionVoteTimeoutRef.current = null;
      }

      if (ladyTargetTimeoutRef.current) {
        clearTimeout(ladyTargetTimeoutRef.current);
        ladyTargetTimeoutRef.current = null;
      }

      if (assassinActionTimeoutRef.current) {
        clearTimeout(assassinActionTimeoutRef.current);
        assassinActionTimeoutRef.current = null;
      }

      const socket = socketRef.current;
      socketRef.current = null;
      socket?.close();
    };
  }, [tableId]);

  function sendSocketMessage(
    message: Record<string, unknown>,
    unavailableMessage: string,
  ) {
    const socket = socketRef.current;

    setError(null);
    setNotice(null);

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setError(unavailableMessage);
      return false;
    }

    socket.send(JSON.stringify(message));
    return true;
  }

  function cancelGame(gameId: string) {
    if (!canCancelFromWs) {
      setError(
        "سرور وب‌سوکت هنوز قابلیت لغو بازی را اعلام نکرده است. سرور dev:avalon را ری‌استارت کنید.",
      );
      return;
    }

    setCancellingGameId(gameId);
    cancelTimeoutRef.current = setTimeout(() => {
      setCancellingGameId(null);
      setError(
        "پاسخی برای لغو بازی دریافت نشد. احتمالا سرور وب‌سوکت باید ری‌استارت شود.",
      );
    }, ACTION_TIMEOUT_MS);

    if (
      !sendSocketMessage(
        {
          type: "avalon.cancelGame",
          data: { gameId },
        },
        SOCKET_UNAVAILABLE_MESSAGE,
      )
    ) {
      setCancellingGameId(null);
    }
  }

  function startGame(gameId: string) {
    if (!canStartFromWs) {
      setError(
        "سرور وب‌سوکت هنوز قابلیت شروع بازی را اعلام نکرده است. سرور dev:avalon را ری‌استارت کنید.",
      );
      return;
    }

    setStartingGameId(gameId);
    startTimeoutRef.current = setTimeout(() => {
      setStartingGameId(null);
      setError(
        "پاسخی برای شروع بازی دریافت نشد. احتمالا سرور وب‌سوکت باید ری‌استارت شود.",
      );
    }, ACTION_TIMEOUT_MS);

    if (
      !sendSocketMessage(
        {
          type: "avalon.startGame",
          data: { gameId },
        },
        SOCKET_UNAVAILABLE_MESSAGE,
      )
    ) {
      setStartingGameId(null);
    }
  }

  function selectSeat(game: AvalonWsGame, seat: AvalonWsSeat) {
    setError(null);
    setNotice(null);

    if (game.status !== "lobby" || seat.player) {
      return;
    }

    setSelectedSeatByGame((current) => ({
      ...current,
      [game.id]: current[game.id] === seat.id ? null : seat.id,
    }));
  }

  function toggleTeamSeat(questId: string, seatId: string, teamSlotCount: number) {
    setError(null);
    setNotice(null);

    setSelectedTeamSeatsByQuest((current) => {
      const selectedSeats = current[questId] ?? [];

      if (selectedSeats.includes(seatId)) {
        return {
          ...current,
          [questId]: selectedSeats.filter(
            (selectedSeatId) => selectedSeatId !== seatId,
          ),
        };
      }

      if (selectedSeats.length >= teamSlotCount) {
        setError(`برای این ماموریت فقط ${teamSlotCount} صندلی انتخاب کنید.`);
        return current;
      }

      return {
        ...current,
        [questId]: [...selectedSeats, seatId],
      };
    });
  }

  function selectLadyTarget(ladyCheckId: string, seatId: string) {
    setError(null);
    setNotice(null);

    setSelectedLadyTargetByCheck((current) => ({
      ...current,
      [ladyCheckId]: current[ladyCheckId] === seatId ? null : seatId,
    }));
  }

  function selectAssassinTarget(assassinationId: string, seatId: string) {
    setError(null);
    setNotice(null);

    setSelectedAssassinTargetByAssassination((current) => ({
      ...current,
      [assassinationId]:
        current[assassinationId] === seatId ? null : seatId,
    }));
  }

  function joinSeat(gameId: string) {
    const seatId = selectedSeatByGame[gameId];

    if (!seatId) {
      setError("اول یک صندلی خالی را انتخاب کنید.");
      return;
    }

    if (!canChangeSeatFromWs) {
      setError(
        "سرور وب‌سوکت هنوز قابلیت نشستن را اعلام نکرده است. سرور dev:avalon را ری‌استارت کنید.",
      );
      return;
    }

    setPendingSeatGameId(gameId);
    seatTimeoutRef.current = setTimeout(() => {
      setPendingSeatGameId(null);
      setError(
        "پاسخی برای نشستن دریافت نشد. احتمالا سرور وب‌سوکت باید ری‌استارت شود.",
      );
    }, ACTION_TIMEOUT_MS);

    if (
      !sendSocketMessage(
        {
          type: "avalon.joinSeat",
          data: { gameId, seatId },
        },
        SOCKET_UNAVAILABLE_MESSAGE,
      )
    ) {
      setPendingSeatGameId(null);
    }
  }

  function changeSeat(gameId: string) {
    const seatId = selectedSeatByGame[gameId];

    if (!seatId) {
      setError("اول یک صندلی خالی را انتخاب کنید.");
      return;
    }

    if (!canChangeSeatFromWs) {
      setError(
        "سرور وب‌سوکت هنوز قابلیت تغییر صندلی را اعلام نکرده است. سرور dev:avalon را ری‌استارت کنید.",
      );
      return;
    }

    setPendingSeatGameId(gameId);
    seatTimeoutRef.current = setTimeout(() => {
      setPendingSeatGameId(null);
      setError(
        "پاسخی برای تغییر صندلی دریافت نشد. احتمالا سرور وب‌سوکت باید ری‌استارت شود.",
      );
    }, ACTION_TIMEOUT_MS);

    if (
      !sendSocketMessage(
        {
          type: "avalon.changeSeat",
          data: { gameId, seatId },
        },
        SOCKET_UNAVAILABLE_MESSAGE,
      )
    ) {
      setPendingSeatGameId(null);
    }
  }

  function leaveSeat(gameId: string) {
    if (!canChangeSeatFromWs) {
      setError(
        "سرور وب‌سوکت هنوز قابلیت ترک صندلی را اعلام نکرده است. سرور dev:avalon را ری‌استارت کنید.",
      );
      return;
    }

    setPendingSeatGameId(gameId);
    seatTimeoutRef.current = setTimeout(() => {
      setPendingSeatGameId(null);
      setError(
        "پاسخی برای ترک صندلی دریافت نشد. احتمالا سرور وب‌سوکت باید ری‌استارت شود.",
      );
    }, ACTION_TIMEOUT_MS);

    if (
      !sendSocketMessage(
        {
          type: "avalon.leaveSeat",
          data: { gameId },
        },
        SOCKET_UNAVAILABLE_MESSAGE,
      )
    ) {
      setPendingSeatGameId(null);
    }
  }

  function nightAlreadyCheck(gameId: string, nightCheckId: string) {
    if (!canNightAlreadyCheckFromWs) {
      setError(
        "سرور وب‌سوکت هنوز قابلیت ثبت بررسی شب را اعلام نکرده است. سرور dev:avalon را ری‌استارت کنید.",
      );
      return;
    }

    nightCheckTimeoutRef.current = setTimeout(() => {
      setError(
        "پاسخی برای ثبت بررسی شب دریافت نشد. احتمالا سرور وب‌سوکت باید ری‌استارت شود.",
      );
    }, ACTION_TIMEOUT_MS);

    if (
      !sendSocketMessage(
        {
          type: "avalon.nightAlreadyCheck",
          data: { gameId, nightCheckId },
        },
        SOCKET_UNAVAILABLE_MESSAGE,
      ) &&
      nightCheckTimeoutRef.current
    ) {
      clearTimeout(nightCheckTimeoutRef.current);
      nightCheckTimeoutRef.current = null;
    }
  }

  function nominateTeammates(
    gameId: string,
    questId: string,
    teamSlotCount: number,
  ) {
    const nominatedSeatIds = selectedTeamSeatsByQuest[questId] ?? [];

    if (!canNominateTeammatesFromWs) {
      setError(
        "سرور وب‌سوکت هنوز قابلیت انتخاب تیم ماموریت را اعلام نکرده است. سرور dev:avalon را ری‌استارت کنید.",
      );
      return;
    }

    if (nominatedSeatIds.length !== teamSlotCount) {
      setError(`برای این ماموریت باید ${teamSlotCount} صندلی انتخاب شود.`);
      return;
    }

    setPendingNominationQuestId(questId);
    nominationTimeoutRef.current = setTimeout(() => {
      setPendingNominationQuestId(null);
      setError(
        "پاسخی برای انتخاب تیم ماموریت دریافت نشد. احتمالا سرور وب‌سوکت باید ری‌استارت شود.",
      );
    }, ACTION_TIMEOUT_MS);

    if (
      !sendSocketMessage(
        {
          type: "avalon.nominateTeammates",
          data: { gameId, questId, nominatedSeatIds },
        },
        SOCKET_UNAVAILABLE_MESSAGE,
      ) &&
      nominationTimeoutRef.current
    ) {
      clearTimeout(nominationTimeoutRef.current);
      nominationTimeoutRef.current = null;
      setPendingNominationQuestId(null);
    }
  }

  function decideQuest(
    gameId: string,
    questId: string,
    decision: "approve" | "disapprove",
  ) {
    if (!canQuestDecisionFromWs) {
      setError(
        "سرور وب‌سوکت هنوز قابلیت ثبت تصمیم ماموریت را اعلام نکرده است. سرور dev:avalon را ری‌استارت کنید.",
      );
      return;
    }

    setPendingDecisionQuestId(questId);
    questDecisionTimeoutRef.current = setTimeout(() => {
      setPendingDecisionQuestId(null);
      setError(
        "پاسخی برای ثبت تصمیم ماموریت دریافت نشد. احتمالا سرور وب‌سوکت باید ری‌استارت شود.",
      );
    }, ACTION_TIMEOUT_MS);

    if (
      !sendSocketMessage(
        {
          type: "avalon.questDecision",
          data: { gameId, questId, decision },
        },
        SOCKET_UNAVAILABLE_MESSAGE,
      ) &&
      questDecisionTimeoutRef.current
    ) {
      clearTimeout(questDecisionTimeoutRef.current);
      questDecisionTimeoutRef.current = null;
      setPendingDecisionQuestId(null);
    }
  }

  function voteMission(
    gameId: string,
    missionId: string,
    vote: "success" | "fail",
  ) {
    if (!canMissionVoteFromWs) {
      setError(
        "Ø³Ø±ÙˆØ± ÙˆØ¨â€ŒØ³ÙˆÚ©Øª Ù‡Ù†ÙˆØ² Ù‚Ø§Ø¨Ù„ÛŒØª Ø«Ø¨Øª Ø±Ø£ÛŒ Ù…Ø§Ù…ÙˆØ±ÛŒØª Ø±Ø§ Ø§Ø¹Ù„Ø§Ù… Ù†Ú©Ø±Ø¯Ù‡ Ø§Ø³Øª. Ø³Ø±ÙˆØ± dev:avalon Ø±Ø§ Ø±ÛŒâ€ŒØ§Ø³ØªØ§Ø±Øª Ú©Ù†ÛŒØ¯.",
      );
      return;
    }

    setPendingMissionVoteId(missionId);
    missionVoteTimeoutRef.current = setTimeout(() => {
      setPendingMissionVoteId(null);
      setError(
        "Ù¾Ø§Ø³Ø®ÛŒ Ø¨Ø±Ø§ÛŒ Ø«Ø¨Øª Ø±Ø£ÛŒ Ù…Ø§Ù…ÙˆØ±ÛŒØª Ø¯Ø±ÛŒØ§ÙØª Ù†Ø´Ø¯. Ø§Ø­ØªÙ…Ø§Ù„Ø§ Ø³Ø±ÙˆØ± ÙˆØ¨â€ŒØ³ÙˆÚ©Øª Ø¨Ø§ÛŒØ¯ Ø±ÛŒâ€ŒØ§Ø³ØªØ§Ø±Øª Ø´ÙˆØ¯.",
      );
    }, ACTION_TIMEOUT_MS);

    if (
      !sendSocketMessage(
        {
          type: "avalon.missionVote",
          data: { gameId, missionId, vote },
        },
        SOCKET_UNAVAILABLE_MESSAGE,
      ) &&
      missionVoteTimeoutRef.current
    ) {
      clearTimeout(missionVoteTimeoutRef.current);
      missionVoteTimeoutRef.current = null;
      setPendingMissionVoteId(null);
    }
  }

  function chooseLadyTarget(gameId: string, ladyCheckId: string) {
    const targetSeatId = selectedLadyTargetByCheck[ladyCheckId];

    if (!canLadyTargetFromWs) {
      setError(
        "Websocket server has not announced Lady of the Lake target capability. Restart dev:avalon.",
      );
      return;
    }

    if (!targetSeatId) {
      setError("Choose a target seat for Lady of the Lake.");
      return;
    }

    setPendingLadyTargetId(ladyCheckId);
    ladyTargetTimeoutRef.current = setTimeout(() => {
      setPendingLadyTargetId(null);
      setError(
        "No response was received for Lady of the Lake target. The websocket server may need a restart.",
      );
    }, ACTION_TIMEOUT_MS);

    if (
      !sendSocketMessage(
        {
          type: "avalon.ladyTarget",
          data: { gameId, ladyCheckId, targetSeatId },
        },
        SOCKET_UNAVAILABLE_MESSAGE,
      ) &&
      ladyTargetTimeoutRef.current
    ) {
      clearTimeout(ladyTargetTimeoutRef.current);
      ladyTargetTimeoutRef.current = null;
      setPendingLadyTargetId(null);
    }
  }

  function chooseAssassinTarget(gameId: string, assassinationId: string) {
    const targetSeatId =
      selectedAssassinTargetByAssassination[assassinationId];

    if (!canAssassinActionFromWs) {
      setError(
        "Websocket server has not announced assassin action capability. Restart dev:avalon.",
      );
      return;
    }

    if (!targetSeatId) {
      setError("Choose who you think is Merlin.");
      return;
    }

    setPendingAssassinActionId(assassinationId);
    assassinActionTimeoutRef.current = setTimeout(() => {
      setPendingAssassinActionId(null);
      setError(
        "No response was received for assassination. The websocket server may need a restart.",
      );
    }, ACTION_TIMEOUT_MS);

    if (
      !sendSocketMessage(
        {
          type: "avalon.assassinAction",
          data: { gameId, assassinationId, targetSeatId },
        },
        SOCKET_UNAVAILABLE_MESSAGE,
      ) &&
      assassinActionTimeoutRef.current
    ) {
      clearTimeout(assassinActionTimeoutRef.current);
      assassinActionTimeoutRef.current = null;
      setPendingAssassinActionId(null);
    }
  }

  return {
    games,
    tableSnapshot,
    wsUser,
    connectionStatus,
    lastUpdatedAt,
    error,
    notice,
    cancellingGameId,
    startingGameId,
    selectedSeatByGame,
    selectedTeamSeatsByQuest,
    selectedLadyTargetByCheck,
    selectedAssassinTargetByAssassination,
    pendingSeatGameId,
    pendingNominationQuestId,
    pendingDecisionQuestId,
    pendingMissionVoteId,
    pendingLadyTargetId,
    pendingAssassinActionId,
    wsUrl,
    actions: {
      cancelGame,
      startGame,
      selectSeat,
      toggleTeamSeat,
      selectLadyTarget,
      selectAssassinTarget,
      joinSeat,
      changeSeat,
      leaveSeat,
      nightAlreadyCheck,
      nominateTeammates,
      decideQuest,
      voteMission,
      chooseLadyTarget,
      chooseAssassinTarget,
    },
  };
}
