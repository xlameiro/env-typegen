#!/usr/bin/env bash
set -u

ROOT="/Users/xlameiro/Proyectos/env-typegen/qa-test/fixtures-rerun"
REPORT="/Users/xlameiro/Proyectos/env-typegen/qa-test/reports/qa-cli-rerun-2026-03-17.log"

: > "$REPORT"

run_case() {
  local name="$1"
  shift
  echo "" >> "$REPORT"
  echo "===== CASE: $name =====" >> "$REPORT"
  echo "CMD: $*" >> "$REPORT"
  local output
  output=$("$@" 2>&1)
  local code=$?
  echo "EXIT: $code" >> "$REPORT"
  echo "$output" >> "$REPORT"
}

run_case "help-main" pnpm exec env-typegen --help
run_case "version-main" pnpm exec env-typegen --version
run_case "help-check" pnpm exec env-typegen check --help
run_case "help-diff" pnpm exec env-typegen diff --help
run_case "help-doctor" pnpm exec env-typegen doctor --help

run_case "generate-default" pnpm exec env-typegen -i "$ROOT/.env.example" -o "$ROOT/outputs/default.ts"
run_case "generate-explicit-subcommand" pnpm exec env-typegen generate -i "$ROOT/.env.example" -o "$ROOT/outputs/explicit-subcommand.ts"
run_case "generate-format-ts" pnpm exec env-typegen -i "$ROOT/.env.example" -o "$ROOT/outputs/format-ts.ts" -f ts
run_case "generate-format-typescript" pnpm exec env-typegen -i "$ROOT/.env.example" -o "$ROOT/outputs/format-typescript.ts" -f typescript
run_case "generate-format-zod" pnpm exec env-typegen -i "$ROOT/.env.example" -o "$ROOT/outputs/format-zod.ts" -f zod
run_case "generate-format-t3" pnpm exec env-typegen -i "$ROOT/.env.example" -o "$ROOT/outputs/format-t3.ts" -f t3
run_case "generate-format-declaration" pnpm exec env-typegen -i "$ROOT/.env.example" -o "$ROOT/outputs/format-declaration.ts" -f declaration
run_case "generate-generator-alias-g" pnpm exec env-typegen -i "$ROOT/.env.example" -o "$ROOT/outputs/generator-alias.ts" -g zod
run_case "generate-multi-format" pnpm exec env-typegen -i "$ROOT/.env.example" -o "$ROOT/outputs/multi-format.ts" -f ts -f zod -f t3 -f declaration
run_case "generate-multi-input" pnpm exec env-typegen -i "$ROOT/.env.example" -i "$ROOT/.env.staging" -o "$ROOT/outputs/multi-input.ts" -f ts
run_case "generate-stdout" pnpm exec env-typegen -i "$ROOT/.env.example" -o "$ROOT/outputs/stdout.ts" --stdout
run_case "generate-dry-run" pnpm exec env-typegen -i "$ROOT/.env.example" -o "$ROOT/outputs/dry-run.ts" --dry-run
run_case "generate-no-format" pnpm exec env-typegen -i "$ROOT/.env.example" -o "$ROOT/outputs/no-format.ts" --no-format
run_case "generate-silent" pnpm exec env-typegen -i "$ROOT/.env.example" -o "$ROOT/outputs/silent.ts" --silent
run_case "generate-config-short-c" pnpm exec env-typegen -c "$ROOT/env-typegen.config.mjs"

run_case "check-valid" pnpm exec env-typegen check --env "$ROOT/.env" --contract "$ROOT/env.contract.mjs"
run_case "check-invalid" pnpm exec env-typegen check --env "$ROOT/.env.bad" --contract "$ROOT/env.contract.mjs"
run_case "check-example-only" pnpm exec env-typegen check --env "$ROOT/.env" --example "$ROOT/.env.example"
run_case "check-strict" pnpm exec env-typegen check --env "$ROOT/.env.staging" --contract "$ROOT/env.contract.mjs" --strict
run_case "check-no-strict" pnpm exec env-typegen check --env "$ROOT/.env.staging" --contract "$ROOT/env.contract.mjs" --no-strict
run_case "check-json" pnpm exec env-typegen check --env "$ROOT/.env.bad" --contract "$ROOT/env.contract.mjs" --json
run_case "check-json-pretty" pnpm exec env-typegen check --env "$ROOT/.env.bad" --contract "$ROOT/env.contract.mjs" --json=pretty
run_case "check-json-compact" pnpm exec env-typegen check --env "$ROOT/.env.bad" --contract "$ROOT/env.contract.mjs" --json=compact
run_case "check-output-file" pnpm exec env-typegen check --env "$ROOT/.env.bad" --contract "$ROOT/env.contract.mjs" --json --output-file "$ROOT/outputs/check-report.json"
run_case "check-debug-values" pnpm exec env-typegen check --env "$ROOT/.env.bad" --contract "$ROOT/env.contract.mjs" --debug-values --json
run_case "check-cloud-vercel" pnpm exec env-typegen check --env "$ROOT/.env" --contract "$ROOT/env.contract.mjs" --cloud-provider vercel --cloud-file "$ROOT/cloud/vercel-env.json" --json
run_case "check-cloud-cloudflare" pnpm exec env-typegen check --env "$ROOT/.env" --contract "$ROOT/env.contract.mjs" --cloud-provider cloudflare --cloud-file "$ROOT/cloud/cloudflare-env.json" --json
run_case "check-cloud-aws" pnpm exec env-typegen check --env "$ROOT/.env" --contract "$ROOT/env.contract.mjs" --cloud-provider aws --cloud-file "$ROOT/cloud/aws-env.json" --json
run_case "check-cloud-invalid-provider" pnpm exec env-typegen check --env "$ROOT/.env" --contract "$ROOT/env.contract.mjs" --cloud-provider gcp --cloud-file "$ROOT/cloud/gcp-env.json"
run_case "check-plugin-valid" pnpm exec env-typegen check --env "$ROOT/.env" --contract "$ROOT/env.contract.mjs" --plugin "$ROOT/plugins/qa-plugin-valid.mjs"
run_case "check-plugin-repeatable" pnpm exec env-typegen check --env "$ROOT/.env" --contract "$ROOT/env.contract.mjs" --plugin "$ROOT/plugins/qa-plugin-valid.mjs" --plugin "$ROOT/plugins/qa-plugin-valid.mjs"
run_case "check-plugin-invalid-shape" pnpm exec env-typegen check --env "$ROOT/.env" --contract "$ROOT/env.contract.mjs" --plugin "$ROOT/plugins/qa-plugin-invalid.mjs"
run_case "check-plugin-missing" pnpm exec env-typegen check --env "$ROOT/.env" --contract "$ROOT/env.contract.mjs" --plugin "$ROOT/plugins/missing-plugin.mjs"
run_case "check-config-short-c" pnpm exec env-typegen check -c "$ROOT/env-typegen.config.mjs" --env "$ROOT/.env"

run_case "diff-default" pnpm exec env-typegen diff --targets "$ROOT/.env,$ROOT/.env.staging,$ROOT/.env.production" --contract "$ROOT/env.contract.mjs"
run_case "diff-example-only" pnpm exec env-typegen diff --targets "$ROOT/.env,$ROOT/.env.staging" --example "$ROOT/.env.example"
run_case "diff-strict" pnpm exec env-typegen diff --targets "$ROOT/.env,$ROOT/.env.staging,$ROOT/.env.production" --contract "$ROOT/env.contract.mjs" --strict
run_case "diff-no-strict" pnpm exec env-typegen diff --targets "$ROOT/.env,$ROOT/.env.staging,$ROOT/.env.production" --contract "$ROOT/env.contract.mjs" --no-strict
run_case "diff-json" pnpm exec env-typegen diff --targets "$ROOT/.env,$ROOT/.env.staging,$ROOT/.env.production" --contract "$ROOT/env.contract.mjs" --json
run_case "diff-json-pretty" pnpm exec env-typegen diff --targets "$ROOT/.env,$ROOT/.env.staging,$ROOT/.env.production" --contract "$ROOT/env.contract.mjs" --json=pretty
run_case "diff-json-compact" pnpm exec env-typegen diff --targets "$ROOT/.env,$ROOT/.env.staging,$ROOT/.env.production" --contract "$ROOT/env.contract.mjs" --json=compact
run_case "diff-output-file" pnpm exec env-typegen diff --targets "$ROOT/.env,$ROOT/.env.staging,$ROOT/.env.production" --contract "$ROOT/env.contract.mjs" --json --output-file "$ROOT/outputs/diff-report.json"
run_case "diff-debug-values" pnpm exec env-typegen diff --targets "$ROOT/.env,$ROOT/.env.bad" --contract "$ROOT/env.contract.mjs" --debug-values --json
run_case "diff-cloud-aws" pnpm exec env-typegen diff --targets "$ROOT/.env,$ROOT/.env.staging,$ROOT/.env.production" --contract "$ROOT/env.contract.mjs" --cloud-provider aws --cloud-file "$ROOT/cloud/aws-env.json" --json
run_case "diff-plugin-valid" pnpm exec env-typegen diff --targets "$ROOT/.env,$ROOT/.env.staging" --contract "$ROOT/env.contract.mjs" --plugin "$ROOT/plugins/qa-plugin-valid.mjs" --json
run_case "diff-config-short-c" pnpm exec env-typegen diff -c "$ROOT/env-typegen.config.mjs"

run_case "doctor-default" pnpm exec env-typegen doctor --env "$ROOT/.env" --targets "$ROOT/.env,$ROOT/.env.staging,$ROOT/.env.production" --contract "$ROOT/env.contract.mjs"
run_case "doctor-example-only" pnpm exec env-typegen doctor --env "$ROOT/.env.bad" --targets "$ROOT/.env,$ROOT/.env.production" --example "$ROOT/.env.example"
run_case "doctor-strict" pnpm exec env-typegen doctor --env "$ROOT/.env" --targets "$ROOT/.env,$ROOT/.env.staging,$ROOT/.env.production" --contract "$ROOT/env.contract.mjs" --strict
run_case "doctor-no-strict" pnpm exec env-typegen doctor --env "$ROOT/.env" --targets "$ROOT/.env,$ROOT/.env.staging,$ROOT/.env.production" --contract "$ROOT/env.contract.mjs" --no-strict
run_case "doctor-json" pnpm exec env-typegen doctor --env "$ROOT/.env.bad" --targets "$ROOT/.env,$ROOT/.env.staging,$ROOT/.env.production" --contract "$ROOT/env.contract.mjs" --json
run_case "doctor-json-pretty" pnpm exec env-typegen doctor --env "$ROOT/.env.bad" --targets "$ROOT/.env,$ROOT/.env.staging,$ROOT/.env.production" --contract "$ROOT/env.contract.mjs" --json=pretty
run_case "doctor-json-compact" pnpm exec env-typegen doctor --env "$ROOT/.env.bad" --targets "$ROOT/.env,$ROOT/.env.staging,$ROOT/.env.production" --contract "$ROOT/env.contract.mjs" --json=compact
run_case "doctor-output-file" pnpm exec env-typegen doctor --env "$ROOT/.env.bad" --targets "$ROOT/.env,$ROOT/.env.staging,$ROOT/.env.production" --contract "$ROOT/env.contract.mjs" --json --output-file "$ROOT/outputs/doctor-report.json"
run_case "doctor-debug-values" pnpm exec env-typegen doctor --env "$ROOT/.env.bad" --targets "$ROOT/.env,$ROOT/.env.bad" --contract "$ROOT/env.contract.mjs" --debug-values --json
run_case "doctor-cloud-vercel" pnpm exec env-typegen doctor --env "$ROOT/.env" --targets "$ROOT/.env,$ROOT/.env.staging,$ROOT/.env.production" --contract "$ROOT/env.contract.mjs" --cloud-provider vercel --cloud-file "$ROOT/cloud/vercel-env.json" --json
run_case "doctor-plugin-valid" pnpm exec env-typegen doctor --env "$ROOT/.env" --targets "$ROOT/.env,$ROOT/.env.staging" --contract "$ROOT/env.contract.mjs" --plugin "$ROOT/plugins/qa-plugin-valid.mjs" --json
run_case "doctor-config-short-c" pnpm exec env-typegen doctor -c "$ROOT/env-typegen.config.mjs" --env "$ROOT/.env"

echo "RERUN LOG READY: $REPORT"
