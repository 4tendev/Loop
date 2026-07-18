import {
  avalonTableActionTypes,
} from "./table-actions.mjs";

const AVALON_EVIL_ROLES = new Set(["assassin", "morgana", "mordred", "oberon"]);
const AVALON_VISIBLE_EVIL_MATE_ROLES = new Set([
  "assassin",
  "morgana",
  "mordred",
]);

function createMessage(type, data) {
  return JSON.stringify({
    type,
    data,
    sentAt: new Date().toISOString(),
  });
}

function send(socket, text) {
  if (socket.readyState === 1) {
    socket.send(text);
  }
}

function closeSocket(socket, code = 1000, reason = "Closing") {
  if (socket.readyState === 0 || socket.readyState === 1) {
    socket.close(code, reason);
  }
}

export function createAvalonWebSocketGateway({
  actions,
  clients,
  getActiveAvalonGames,
  getUserFromRequest,
  wsPath,
}) {
  let broadcastQueue = Promise.resolve();
  let snapshotVersion = 0;

  async function broadcastActiveGames({ force = false } = {}) {
    const broadcast = broadcastQueue.then(() =>
      loadAndBroadcastActiveGames({ force }),
    );
    broadcastQueue = broadcast.catch(() => {});
    return broadcast;
  }

  async function loadAndBroadcastActiveGames({ force }) {
    const targetClients = Array.from(clients);
    const watchedGameIds = Array.from(
      new Set(
        targetClients
          .map((client) => client.gameId)
          .filter(Boolean),
      ),
    );
    const games = await getActiveAvalonGames({
      includeGameIds: watchedGameIds,
    });
    snapshotVersion += 1;

    for (const client of targetClients) {
      if (!clients.has(client)) {
        continue;
      }

      const clientGames = client.gameId
        ? games.filter((game) => game.id === client.gameId)
        : games.filter(
            (game) =>
              game.status !== "completed" && game.status !== "cancelled",
          );

      if (client.gameId) {
        sendTableSnapshot(client, clientGames[0] ?? null, {
          force,
          snapshotVersion,
        });
        continue;
      }

      const publicClientGames = clientGames.map((game) =>
        sanitizeGameForClient(game),
      );
      const gamesJson = JSON.stringify(publicClientGames);

      if (!force && gamesJson === client.latestGamesJson) {
        continue;
      }

      client.latestGamesJson = gamesJson;
      send(
        client,
        createMessage("avalon.games", {
          games: publicClientGames,
          snapshotVersion,
        }),
      );
    }
  }

  async function acceptWebSocket(request, socket, requestUrl) {
    const pendingMessages = [];
    const queuePendingMessage = (data, isBinary) => {
      pendingMessages.push({ data, isBinary });
    };
    socket.on("message", queuePendingMessage);
    socket.on("close", () => {
      handleClientDisconnect(socket);
    });
    socket.on("error", () => {
      handleClientDisconnect(socket);
    });
    socket.isAlive = true;
    socket.on("pong", () => {
      socket.isAlive = true;
    });

    const user = await getUserFromRequest(request).catch((error) => {
      console.error("Failed to read websocket user session", error);
      return null;
    });

    if (socket.readyState !== 1) {
      return;
    }

    socket.user = user;
    socket.gameId = requestUrl.searchParams.get("gameId") || null;
    socket.latestGamesJson = "";
    socket.latestTableJson = "";
    clients.add(socket);
    send(
      socket,
      createMessage("hello", {
        endpoint: wsPath,
        gameId: socket.gameId,
        capabilities: avalonTableActionTypes,
        user: user
          ? {
              id: user.id,
              name: user.name,
              profileImage: user.profileImage,
            }
          : null,
      }),
    );
    broadcastActiveGames({ force: true }).catch((error) => {
      console.error("Failed to send Avalon games snapshot", error);
      send(socket, createMessage("error", { message: "Failed to load games" }));
    });

    const handleMessage = (data, isBinary) => {
      if (!isBinary) {
        handleClientMessage(socket, data.toString());
      }
    };
    socket.off("message", queuePendingMessage);
    socket.on("message", handleMessage);

    for (const message of pendingMessages) {
      handleMessage(message.data, message.isBinary);
    }

  }

  function handleClientDisconnect(socket) {
    if (!clients.delete(socket)) {
      return;
    }

    broadcastActiveGames().catch((error) => {
      console.error("Failed to update Avalon player presence", error);
    });
  }

  function sendTableSnapshot(
    socket,
    game,
    { force = false, snapshotVersion },
  ) {
    const snapshot = createTableSnapshot(game, socket.user);
    const tableJson = JSON.stringify(snapshot);

    if (!force && tableJson === socket.latestTableJson) {
      return;
    }

    socket.latestTableJson = tableJson;
    send(
      socket,
      createMessage("avalon.table", { ...snapshot, snapshotVersion }),
    );
  }

  function createTableSnapshot(game, user) {
    return {
      gameId: game?.id ?? null,
      tableInfo: game
        ? sanitizeGameForClient(game, user)
        : null,
      privateMessage: getPrivateMessage(game, user),
      actionRequired: getActionRequired(game, user),
    };
  }

  function getPrivateMessage(game, user) {
    return getOwnSeat(game, user)?.privateMessage ?? null;
  }

  function getActionRequired(game, user) {
    return getOwnSeat(game, user)?.actionRequired ?? null;
  }

  function getOwnSeat(game, user) {
    if (!game || !user) {
      return null;
    }

    return game.seats.find((seat) => seat.player?.id === user.id) ?? null;
  }

  function sanitizeGameForClient(game, user = null) {
    const ownSeat = getOwnSeat(game, user);
    const canSeeOwnRole = game.startedAt !== null && ownSeat?.role;
    const canSeeAllRoles = game.status === "completed" && game.winnerSide !== null;
    const canSeeEvilRoles =
      game.status === "inProgress" &&
      game.phases.some(
        (phase) => phase.type === "assassination" && phase.endedAt === null,
      );

    return {
      ...game,
      phases: game.phases.map((phase) =>
        sanitizePhaseForClient(phase, ownSeat, game),
      ),
      seats: game.seats.map(({ privateMessage, actionRequired, role, ...seat }) => {
        const sanitizedSeat = {
          ...seat,
          player: seat.player
            ? {
                ...seat.player,
                isOnline: Array.from(clients).some(
                  (client) => client.user?.id === seat.player.id,
                ),
              }
            : null,
        };

        if (
          canSeeAllRoles ||
          (canSeeEvilRoles && AVALON_EVIL_ROLES.has(role)) ||
          (canSeeOwnRole && seat.id === ownSeat.id)
        ) {
          return {
            ...sanitizedSeat,
            role,
          };
        }

        return sanitizedSeat;
      }),
    };
  }

  function sanitizePhaseForClient(phase, ownSeat, game) {
    const sanitizedPhase = phase.night
      ? {
          ...phase,
          night: {
            ...phase.night,
            summary: buildNightSummaryForSeat(ownSeat, game),
          },
        }
      : phase;

    if (!sanitizedPhase.ladyCheck?.targetSide) {
      return sanitizedPhase;
    }

    const canSeeTargetSide =
      sanitizedPhase.endedAt !== null &&
      sanitizedPhase.ladyCheck.ladySeatId === ownSeat?.id;

    if (canSeeTargetSide) {
      return sanitizedPhase;
    }

    const { targetSide, ...publicLadyCheck } = sanitizedPhase.ladyCheck;

    return {
      ...sanitizedPhase,
      ladyCheck: publicLadyCheck,
    };
  }

  function buildNightSummaryForSeat(ownSeat, game) {
    if (!ownSeat?.role || game.startedAt === null) {
      return null;
    }

    const summary = {
      ownSeatId: ownSeat.id,
      ownSeatNumber: ownSeat.number,
      ownRole: ownSeat.role,
      revealSeats: [],
    };

    if (ownSeat.role === "merlin") {
      summary.revealSeats = game.seats
        .filter((seat) =>
          ["assassin", "morgana", "oberon"].includes(seat.role),
        )
        .map((seat) => createNightRevealSeat(seat, { side: "evil" }));

      return summary;
    }

    if (ownSeat.role === "percival") {
      summary.revealSeats = game.seats
        .filter((seat) => ["merlin", "morgana"].includes(seat.role))
        .map((seat) => createNightRevealSeat(seat));

      return summary;
    }

    if (AVALON_VISIBLE_EVIL_MATE_ROLES.has(ownSeat.role)) {
      summary.revealSeats = game.seats
        .filter(
          (seat) =>
            seat.id !== ownSeat.id &&
            AVALON_VISIBLE_EVIL_MATE_ROLES.has(seat.role),
        )
        .map((seat) =>
          createNightRevealSeat(seat, {
            side: "evil",
            role: game.config.roleExposing ? seat.role : undefined,
          }),
        );
    }

    return summary;
  }

  function createNightRevealSeat(seat, { side, role } = {}) {
    const revealSeat = {
      seatId: seat.id,
      seatNumber: seat.number,
      player: seat.player,
    };

    if (side) {
      revealSeat.side = side;
    }

    if (role) {
      revealSeat.role = role;
    }

    return revealSeat;
  }

  function handleClientMessage(socket, text) {
    try {
      const message = JSON.parse(text);

      if (message?.type === "ping") {
        send(socket, createMessage("pong", null));
      }

      if (message?.type === "refresh") {
        broadcastActiveGames({ force: true }).catch((error) => {
          console.error("Failed to refresh Avalon games", error);
        });
      }

      if (message?.type === "avalon.cancelGame") {
        runAction(socket, {
          action: () =>
            actions.cancelAvalonGame(message.data?.gameId, socket.user?.id),
          errorMessage: "لغو بازی انجام نشد",
          logMessage: "Failed to cancel Avalon game",
          resultType: "avalon.cancelGame.result",
        });
      }

      if (message?.type === "avalon.startGame") {
        runAction(socket, {
          action: () =>
            actions.startAvalonGame(message.data?.gameId, socket.user?.id),
          errorMessage: "شروع بازی انجام نشد",
          logMessage: "Failed to start Avalon game",
          resultType: "avalon.startGame.result",
        });
      }

      if (message?.type === "avalon.joinSeat") {
        runAction(socket, {
          action: () =>
            actions.joinAvalonSeat(
              message.data?.gameId,
              message.data?.seatId,
              socket.user?.id,
            ),
          errorMessage: "نشستن روی صندلی انجام نشد",
          logMessage: "Failed to join Avalon seat",
          resultType: "avalon.seat.result",
        });
      }

      if (message?.type === "avalon.changeSeat") {
        runAction(socket, {
          action: () =>
            actions.changeAvalonSeat(
              message.data?.gameId,
              message.data?.seatId,
              socket.user?.id,
            ),
          errorMessage: "تغییر صندلی انجام نشد",
          logMessage: "Failed to change Avalon seat",
          resultType: "avalon.seat.result",
        });
      }

      if (message?.type === "avalon.leaveSeat") {
        runAction(socket, {
          action: () =>
            actions.leaveAvalonSeat(message.data?.gameId, socket.user?.id),
          errorMessage: "ترک صندلی انجام نشد",
          logMessage: "Failed to leave Avalon seat",
          resultType: "avalon.seat.result",
        });
      }

      if (message?.type === "avalon.nightAlreadyCheck") {
        runAction(socket, {
          action: () =>
            actions.nightAlreadyCheckAvalonGame(
              message.data?.gameId,
              message.data?.nightCheckId ?? message.data?.id,
              socket.user?.id,
            ),
          errorMessage: "ثبت بررسی شب انجام نشد",
          logMessage: "Failed to complete Avalon night check",
          resultType: "avalon.nightAlreadyCheck.result",
        });
      }

      if (message?.type === "avalon.nominateTeammates") {
        runAction(socket, {
          action: () =>
            actions.nominateAvalonTeammates(
              message.data?.gameId,
              message.data?.questId ?? message.data?.id,
              message.data?.nominatedSeats ??
                message.data?.nominatedSeatIds ??
                message.data?.seatIds,
              socket.user?.id,
            ),
          errorMessage: "انتخاب تیم ماموریت انجام نشد",
          logMessage: "Failed to nominate Avalon teammates",
          resultType: "avalon.nominateTeammates.result",
        });
      }

      if (message?.type === "avalon.questDecision") {
        runAction(socket, {
          action: () =>
            actions.decideAvalonQuest(
              message.data?.gameId,
              message.data?.questId ?? message.data?.id,
              message.data?.decision,
              socket.user?.id,
            ),
          errorMessage: "ثبت تصمیم ماموریت انجام نشد",
          logMessage: "Failed to decide Avalon quest",
          resultType: "avalon.questDecision.result",
        });
      }

      if (message?.type === "avalon.missionVote") {
        runAction(socket, {
          action: () =>
            actions.voteAvalonMission(
              message.data?.gameId,
              message.data?.missionId ?? message.data?.id,
              message.data?.vote,
              socket.user?.id,
            ),
          errorMessage: "Mission vote was not saved",
          logMessage: "Failed to vote Avalon mission",
          resultType: "avalon.missionVote.result",
        });
      }

      if (message?.type === "avalon.ladyTarget") {
        runAction(socket, {
          action: () =>
            actions.chooseAvalonLadyTarget(
              message.data?.gameId,
              message.data?.ladyCheckId ?? message.data?.id,
              message.data?.targetSeatId ?? message.data?.seatId,
              socket.user?.id,
            ),
          errorMessage: "Lady of the Lake target was not saved",
          logMessage: "Failed to choose Avalon Lady target",
          resultType: "avalon.ladyTarget.result",
        });
      }

      if (message?.type === "avalon.assassinAction") {
        runAction(socket, {
          action: () =>
            actions.chooseAvalonAssassinationTarget(
              message.data?.gameId,
              message.data?.assassinationId ?? message.data?.id,
              message.data?.targetSeatId ?? message.data?.seatId,
              socket.user?.id,
            ),
          errorMessage: "Assassination target was not saved",
          logMessage: "Failed to choose Avalon assassination target",
          resultType: "avalon.assassinAction.result",
        });
      }
    } catch (error) {
      console.error("Failed to handle websocket message", error);
      send(socket, createMessage("error", { message: "Invalid JSON message" }));
    }
  }

  function runAction(socket, { action, errorMessage, logMessage, resultType }) {
    Promise.resolve()
      .then(action)
      .then((result) => {
        send(socket, createMessage(resultType, result));

        if (result.ok) {
          return broadcastActiveGames({ force: true });
        }

        return null;
      })
      .catch((error) => {
        console.error(logMessage, error);
        send(
          socket,
          createMessage(resultType, {
            ok: false,
            message: errorMessage,
          }),
        );
      });
  }

  return {
    acceptWebSocket,
    broadcastActiveGames,
    closeSocket,
  };
}
