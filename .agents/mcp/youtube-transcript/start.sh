#!/usr/bin/env sh
# Bootstrap: install deps on first run, then start the MCP server
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

if [ ! -d node_modules ]; then
  npm install --silent 2>/dev/null
fi

exec node index.mjs
