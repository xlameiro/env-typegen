#!/usr/bin/env sh
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

if [ ! -d node_modules ]; then
  if [ -f package-lock.json ]; then
    npm ci --silent 2>/dev/null
  else
    npm install --silent 2>/dev/null
  fi
fi

exec node index.mjs
