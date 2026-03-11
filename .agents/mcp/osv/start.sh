#!/usr/bin/env sh
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

if [ ! -d node_modules ]; then
  npm install --silent 2>/dev/null
fi

exec node index.mjs
