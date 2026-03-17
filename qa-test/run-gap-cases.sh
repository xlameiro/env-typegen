#!/usr/bin/env bash
set -u
ROOT="/Users/xlameiro/Proyectos/env-typegen/qa-test"
GAP="$ROOT/reports/qa-cli-gaps-2026-03-17.log"
: > "$GAP"

run_case() {
  local name="$1"
  shift
  echo "" >> "$GAP"
  echo "===== CASE: $name =====" >> "$GAP"
  echo "CMD: $*" >> "$GAP"
  local output
  output=$("$@" 2>&1)
  local code=$?
  echo "EXIT: $code" >> "$GAP"
  echo "$output" >> "$GAP"
}

cd "$ROOT" || exit 1

run_case "check-example-only" pnpm exec env-typegen check --env "$ROOT/.env" --example "$ROOT/.env.example"
run_case "check-explicit-strict" pnpm exec env-typegen check --env "$ROOT/.env.staging" --contract "$ROOT/env.contract.mjs" --strict
run_case "check-config-short-c" pnpm exec env-typegen check -c "$ROOT/env-typegen.config.mjs" --env "$ROOT/.env"
run_case "check-cloud-cloudflare-valid" pnpm exec env-typegen check --env "$ROOT/.env" --contract "$ROOT/env.contract.mjs" --cloud-provider cloudflare --cloud-file "$ROOT/cloud/cloudflare-env.json" --json
run_case "check-multi-plugin-repeatable" pnpm exec env-typegen check --env "$ROOT/.env" --contract "$ROOT/env.contract.mjs" --plugin "$ROOT/plugins/qa-plugin-with-name.mjs" --plugin "$ROOT/plugins/qa-plugin-with-name-2.mjs"

run_case "diff-example-only" pnpm exec env-typegen diff --targets "$ROOT/.env,$ROOT/.env.staging" --example "$ROOT/.env.example"
run_case "diff-explicit-strict" pnpm exec env-typegen diff --targets "$ROOT/.env,$ROOT/.env.staging,$ROOT/.env.production" --contract "$ROOT/env.contract.mjs" --strict
run_case "diff-debug-values" pnpm exec env-typegen diff --targets "$ROOT/.env,$ROOT/.env.bad" --contract "$ROOT/env.contract.mjs" --debug-values --json
run_case "diff-config-short-c" pnpm exec env-typegen diff -c "$ROOT/env-typegen.config.mjs"
run_case "diff-multi-plugin-repeatable" pnpm exec env-typegen diff --targets "$ROOT/.env,$ROOT/.env.staging" --contract "$ROOT/env.contract.mjs" --plugin "$ROOT/plugins/qa-plugin-with-name.mjs" --plugin "$ROOT/plugins/qa-plugin-with-name-2.mjs" --json

run_case "doctor-example-only" pnpm exec env-typegen doctor --env "$ROOT/.env.bad" --targets "$ROOT/.env,$ROOT/.env.production" --example "$ROOT/.env.example"
run_case "doctor-explicit-strict" pnpm exec env-typegen doctor --env "$ROOT/.env" --targets "$ROOT/.env,$ROOT/.env.staging,$ROOT/.env.production" --contract "$ROOT/env.contract.mjs" --strict
run_case "doctor-debug-values" pnpm exec env-typegen doctor --env "$ROOT/.env.bad" --targets "$ROOT/.env,$ROOT/.env.bad" --contract "$ROOT/env.contract.mjs" --debug-values --json
run_case "doctor-config-short-c" pnpm exec env-typegen doctor -c "$ROOT/env-typegen.config.mjs" --env "$ROOT/.env"
run_case "doctor-multi-plugin-repeatable" pnpm exec env-typegen doctor --env "$ROOT/.env" --targets "$ROOT/.env,$ROOT/.env.staging" --contract "$ROOT/env.contract.mjs" --plugin "$ROOT/plugins/qa-plugin-with-name.mjs" --plugin "$ROOT/plugins/qa-plugin-with-name-2.mjs" --json

echo "DONE: $GAP"
