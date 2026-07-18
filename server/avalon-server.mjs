import { createServer } from "node:http";
import { WebSocketServer } from "ws";

import {
  cancelAvalonGame,
  changeAvalonSeat,
  chooseAvalonAssassinationTarget,
  chooseAvalonLadyTarget,
  decideAvalonQuest,
  joinAvalonSeat,
  leaveAvalonSeat,
  nightAlreadyCheckAvalonGame,
  nominateAvalonTeammates,
  startAvalonGame,
  voteAvalonMission,
} from "./avalon/game-actions.mjs";
import { getActiveAvalonGames } from "./avalon/games-repository.mjs";
import { getServerConfig } from "./avalon/config.mjs";
import { closeDataStores } from "./avalon/database.mjs";
import { getUserFromRequest } from "./avalon/session.mjs";
import { createAvalonWebSocketGateway } from "./avalon/websocket-gateway.mjs";

const { broadcastIntervalMs, host, port, wsPath } = getServerConfig();
const heartbeatIntervalMs = 30000;
const clients = new Set();
const webSocketServer = new WebSocketServer({
  noServer: true,
  maxPayload: 1024 * 1024,
});

const gateway = createAvalonWebSocketGateway({
  actions: {
    cancelAvalonGame,
    changeAvalonSeat,
    chooseAvalonAssassinationTarget,
    chooseAvalonLadyTarget,
    decideAvalonQuest,
    joinAvalonSeat,
    leaveAvalonSeat,
    nightAlreadyCheckAvalonGame,
    nominateAvalonTeammates,
    startAvalonGame,
    voteAvalonMission,
  },
  clients,
  getActiveAvalonGames,
  getUserFromRequest,
  wsPath,
});

const server = createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(
      JSON.stringify({
        ok: true,
        endpoint: wsPath,
        clients: clients.size,
      }),
    );
    return;
  }

  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ ok: false, message: "Not found" }));
});

server.on("upgrade", (request, socket, head) => {
  const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host}`);

  if (requestUrl.pathname !== wsPath) {
    socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
    socket.destroy();
    return;
  }

  webSocketServer.handleUpgrade(request, socket, head, (webSocket) => {
    gateway.acceptWebSocket(request, webSocket, requestUrl).catch((error) => {
      console.error("Failed to accept websocket connection", error);
      webSocket.terminate();
    });
  });
});

const interval = setInterval(() => {
  if (clients.size === 0) {
    return;
  }

  gateway.broadcastActiveGames().catch((error) => {
    console.error("Failed to broadcast Avalon games", error);
  });
}, broadcastIntervalMs);

const heartbeatInterval = setInterval(() => {
  for (const client of clients) {
    if (client.isAlive === false) {
      client.terminate();
      continue;
    }

    client.isAlive = false;
    client.ping();
  }
}, heartbeatIntervalMs);

function shutdown() {
  clearInterval(interval);
  clearInterval(heartbeatInterval);

  for (const client of clients) {
    gateway.closeSocket(client, 1001, "Server shutting down");
  }

  server.close(() => {
    closeDataStores().finally(() => {
      process.exit(0);
    });
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

server.listen(port, host, () => {
  console.log(`Avalon websocket server listening on ws://${host}:${port}${wsPath}`);
});
