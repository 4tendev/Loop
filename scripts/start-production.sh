#!/bin/sh
set -eu

node scripts/migrate.mjs

AVALON_WS_HOST=127.0.0.1 AVALON_WS_PORT=3001 node server/avalon-server.mjs &
avalon_pid="$!"

npm run start -- -p 3000 &
web_pid="$!"

nginx -g "daemon off;" &
nginx_pid="$!"

shutdown() {
  kill "$nginx_pid" "$web_pid" "$avalon_pid" 2>/dev/null || true
}

trap shutdown INT TERM

wait -n "$nginx_pid" "$web_pid" "$avalon_pid"
status="$?"

shutdown
wait "$nginx_pid" "$web_pid" "$avalon_pid" 2>/dev/null || true

exit "$status"
