Overview
La continuación correcta después de Fase 16 no es añadir más superficie de comandos, sino cerrar la brecha entre “governance simulada y controlada” y “governance enterprise operable en producción real”.
Actualmente ya existe una base robusta: plan, sync-preview, sync-apply, policy packs, adapters AWS iniciales, audit trail y workflows de smoke. El gap principal está en profundidad operativa: verificación fuerte del preflight, motor de apply orientado a operaciones, integración AWS real opcional y políticas de distribución/consumo de packs con controles de integridad más allá del checksum puntual.
Este plan propone Parte 5 en 6 fases (17–22), cada una compilable y verificable por separado, manteniendo por defecto read-only y activando write path solo bajo guardrails explícitos y trazables.

Requirements
Mantener compatibilidad completa de generate, check, diff, doctor, pull, verify, plan, sync-preview y sync-apply.
Mantener write path opt-in y bloquear apply por defecto si faltan precondiciones.
Subir el estándar de guardrails de “existencia de preflight” a “integridad y frescura verificable de preflight”.
Evolucionar apply-engine de push monolítico a ejecución por operación con clasificación de fallos y resumen determinista.
Mantener redacción segura de secretos en stdout/stderr, JSON, JSONL y artefactos de CI.
Proveer adapters AWS con modo snapshot (local testing) y modo live opcional (runtime real) sin romper reproducibilidad.
Asegurar que policy packs sean auditables, bloqueables por drift de integridad y aptos para adopción multi-repo.
Endurecer workflows CI para promoción por etapas: advisory, enforce, write-enabled.
Mantener quality gate verde en cada fase: lint, type-check, test, build.
Publicar runbooks de incidente y rollback operativo con pasos verificables.
Evitar acoplamiento provider-specific en core de policy/validation.
Mantener salidas deterministas para automatización CI y auditoría.
Files to Create
File Purpose
packages/env-typegen/src/sync/preflight-proof.ts Modelo firmado de preflight y validación de integridad/frescura
packages/env-typegen/src/sync/apply-engine-v2.ts Motor de apply por operación con clasificación de errores
packages/env-typegen/src/audit/audit-redaction.ts Redacción centralizada extensible para eventos/auditoría
packages/env-typegen/src/policy/policy-pack-lock.ts Lockfile de packs con huellas y control de drift
packages/env-typegen/src/policy/policy-pack-fetch.ts Fetch resiliente y cacheado de packs remotos
packages/env-typegen/src/adapters/aws-runtime.ts Cliente runtime AWS compartido para SSM/Secrets
packages/env-typegen/src/reporting/governance-summary.ts Resumen unificado de verify/plan/sync-preview/sync-apply
packages/env-typegen/tests/sync/preflight-proof.test.ts Cobertura de integridad y expiración de preflight
packages/env-typegen/tests/sync/apply-engine-v2.test.ts Cobertura de apply por operación y errores parciales
packages/env-typegen/tests/audit/audit-redaction.test.ts Cobertura de redacción avanzada
packages/env-typegen/tests/policy/policy-pack-lock.test.ts Cobertura de lockfile y drift detection
packages/env-typegen/tests/policy/policy-pack-fetch.test.ts Cobertura de fetch, retry y cache local
packages/env-typegen/tests/adapters/aws-runtime.test.ts Cobertura de cliente runtime AWS
packages/env-typegen/tests/commands/sync-apply-hardening.test.ts Cobertura de nuevos guardrails de apply
packages/env-typegen/tests/fixtures/policy/packs/enterprise-baseline.policy.json Pack base enterprise
packages/env-typegen/tests/fixtures/policy/packs/enterprise-production.policy.json Overlay estricto enterprise
.github/workflows/env-governance-promotion.yml Pipeline por etapas advisory/enforce/apply
qa-test/env-typegen-governance-promotion-smoke.mjs Smoke de promoción end-to-end
docs/roadmap/infra-governance-part5-roadmap.md Roadmap oficial Parte 5 con KPIs y riesgos
content/docs/governance-promotion.mdx Guía de rollout gradual en CI
packages/env-typegen/docs/governance-promotion.md Guía package-level de promoción
Files to Modify
File Change
sync-apply-command.ts Integrar prueba de preflight fuerte, token de confirmación y apply-engine-v2
apply-engine.ts Mantener compatibilidad y delegar gradualmente a v2
write-guards.ts Añadir reglas de expiración, confirmation token y mismatch con preflight
change-set.ts Añadir hash estable para correlación plan/apply
plan-command.ts Emitir preflight proof verificable y exportable
sync-preview-command.ts Alinear proof-id y hash de changeset
audit-writer.ts Delegar a redaction central y ampliar patrones sensibles
audit-event.ts Extender eventos: requested, verified, blocked, completed, rolled-back
config.ts Extender writePolicy y policy.packs con lock/fetch options
policy-pack.ts Compatibilidad con metadatos de firma/origen
policy-pack-registry.ts Resolver lockfile y estrategia offline-first
aws-ssm-adapter.ts Añadir modo live opcional y push por operación
aws-secrets-manager-adapter.ts Añadir modo live opcional y push por operación
types.ts Contrato v2 para apply por operación e idempotency tokens
testkit.ts Validar contrato v2 read/write con escenarios parciales
cli.ts Nuevas flags de confirmación/promoción y help
sync-apply-command.test.ts Ampliar cobertura de guardrails avanzados
apply-engine.test.ts Mantener compatibilidad retro con v1
audit-writer.test.ts Asegurar no-leak en patrones extra
policy-pack.test.ts Cobertura de lock + precedencia + checksum/signature policy
env-governance-apply.yml Reforzar gates por entorno y artefactos obligatorios
env-governance-apply-dry-run.yml Añadir validación de preflight proof
env-governance-smoke.yml Extender smoke con checks de promoción
env-typegen-apply-smoke.mjs Añadir escenarios stale proof y confirmation token
infra-governance-roadmap.md Registrar transición Parte 4 → Parte 5
README.md Documentar modelo de promoción y límites de seguridad
README.md Documentar contrato adapter v2 y rollout
operations.mdx Runbooks de incidente y rollback operativo
validation.mdx Verify como precondición formal de apply promotion
api.mdx API/flags nuevas de sync-apply hardening
Implementation Steps
Definir un esquema de preflight proof con hash de changeset, timestamp, policy decision y contexto de entorno.
Hacer que plan y sync-preview emitan el mismo proof-id para correlación determinista.
Extender write-guards para validar: preflight vigente, hash match, protected branch context y confirmación explícita.
Introducir token de confirmación de apply para evitar ejecuciones accidentales en CI.
Implementar apply-engine-v2 con ejecución por operación, estados detallados y clasificación de errores transitorios/no transitorios.
Mantener apply-engine v1 como fallback temporal para no romper compatibilidad.
Introducir redaction central reusable y aplicar en audit writer, output JSON y errores.
Ampliar eventos de auditoría para cubrir todo el lifecycle de apply, incluyendo intento y rollback lógico.
Diseñar policy-pack lockfile para congelar versiones/checksums en repos consumidores.
Añadir fetch de packs con timeout, retry y cache local controlada.
Integrar lockfile en policy-pack-registry con modo estricto y modo tolerante.
Evolucionar contrato de adapters a v2 con apply por operación e idempotency semantics.
Añadir runtime AWS compartido y habilitar modo live opcional en adapters SSM y Secrets Manager.
Mantener modo snapshot como baseline determinista para test y CI.
Extender testkit de adapters para validar contrato v2 y resultados parciales.
Endurecer sync-apply command para usar preflight proof y apply-engine-v2.
Actualizar workflows para promoción progresiva: dry-run obligatorio, enforce, apply controlado.
Publicar smoke de promoción con rutas pass/fail y artefactos auditables.
Sincronizar documentación root/package/site para evitar drift narrativo.
Ejecutar quality gate completo tras cada fase y registrar checkpoint con riesgos residuales.
Execution Phases
Phase 17 — Preflight Integrity and Guardrails V2
Scope

File Action
packages/env-typegen/src/sync/preflight-proof.ts Create
write-guards.ts Modify
change-set.ts Modify
plan-command.ts Modify
sync-preview-command.ts Modify
sync-apply-command.ts Modify
packages/env-typegen/tests/sync/preflight-proof.test.ts Create
write-guards.test.ts Modify
packages/env-typegen/tests/commands/sync-apply-hardening.test.ts Create
Pre-conditions

Fases 1–16 completas y verdes.
Changeset canónico estable ya disponible.
Read-only default sigue vigente.
Implementation steps

Crear preflight proof schema.
Emitir proof desde plan/sync-preview.
Validar proof en sync-apply.
Añadir confirm token y reglas de expiración.
Cubrir casos bloqueados y permitidos en tests.
Post-conditions

pnpm --filter @xlameiro/env-typegen lint
pnpm --filter @xlameiro/env-typegen type-check
pnpm --filter @xlameiro/env-typegen test
pnpm --filter @xlameiro/env-typegen build
Sync-apply bloquea apply cuando proof esté ausente, stale o no coincidente.
Continuation Prompt
Phase 17 of env-typegen governance part 5 is complete.

What was done in Phase 17:

Added preflight proof model and verification rules.
Hardened write guards with freshness and confirmation checks.
Aligned plan/sync-preview/sync-apply correlation through deterministic proof-id.
Checkpoint saved to vscode/memory key: phase-17-complete.
Quality gate: lint passed, type-check passed, test passed, build passed.
Continue with Phase 18: Apply Engine V2 and Audit Lifecycle Expansion.

Phase 18 scope:

Scope:

Create packages/env-typegen/src/sync/apply-engine-v2.ts
Create packages/env-typegen/src/audit/audit-redaction.ts
Modify apply-engine.ts
Modify sync-apply-command.ts
Modify audit-event.ts
Modify audit-writer.ts
Modify audit-report.ts
Create packages/env-typegen/tests/sync/apply-engine-v2.test.ts
Modify apply-engine.test.ts
Create packages/env-typegen/tests/audit/audit-redaction.test.ts
Modify audit-writer.test.ts
Pre-conditions:

Phase 17 completed and stable.
Preflight proof and guardrails v2 available.
Implementation steps:

Introduce operation-level apply engine with deterministic status map.
Expand audit lifecycle events and central redaction utility.
Integrate sync-apply with v2 engine and fallback compatibility.
Validate failure classification and non-leak guarantees in tests.
Post-conditions:

pnpm --filter @xlameiro/env-typegen lint passes.
pnpm --filter @xlameiro/env-typegen type-check passes.
pnpm --filter @xlameiro/env-typegen test passes.
pnpm --filter @xlameiro/env-typegen build passes.
Apply output includes deterministic per-operation outcomes and audit lifecycle events.
Phase 18 — Apply Engine V2 and Audit Lifecycle Expansion
Scope

File Action
packages/env-typegen/src/sync/apply-engine-v2.ts Create
packages/env-typegen/src/audit/audit-redaction.ts Create
apply-engine.ts Modify
sync-apply-command.ts Modify
audit-event.ts Modify
audit-writer.ts Modify
audit-report.ts Modify
packages/env-typegen/tests/sync/apply-engine-v2.test.ts Create
apply-engine.test.ts Modify
packages/env-typegen/tests/audit/audit-redaction.test.ts Create
audit-writer.test.ts Modify
Pre-conditions

Phase 17 completa.
Guardrails v2 activos.
Sync-apply baseline estable.
Implementation steps

Crear engine v2 orientado a operaciones.
Extender audit event model.
Centralizar redacción en util dedicada.
Integrar reporting y salidas JSON.
Cubrir errores parciales y reintentos controlados.
Post-conditions

pnpm --filter @xlameiro/env-typegen lint
pnpm --filter @xlameiro/env-typegen type-check
pnpm --filter @xlameiro/env-typegen test
pnpm --filter @xlameiro/env-typegen build
Audit JSONL conserva semántica determinista y no filtra datos sensibles.
Continuation Prompt
Phase 18 of env-typegen governance part 5 is complete.

What was done in Phase 18:

Added apply-engine-v2 with operation-level execution semantics.
Expanded audit lifecycle and centralized redaction.
Integrated sync-apply to produce deterministic operation/audit outputs.
Checkpoint saved to vscode/memory key: phase-18-complete.
Quality gate: lint passed, type-check passed, test passed, build passed.
Continue with Phase 19: AWS Runtime Live Mode and Adapter Contract V2.

Phase 19 scope:

Scope:

Create packages/env-typegen/src/adapters/aws-runtime.ts
Modify types.ts
Modify testkit.ts
Modify aws-ssm-adapter.ts
Modify aws-secrets-manager-adapter.ts
Create packages/env-typegen/tests/adapters/aws-runtime.test.ts
Modify testkit.test.ts
Modify aws-ssm-adapter.test.ts
Modify aws-secrets-manager-adapter.test.ts
Pre-conditions:

Phase 18 completed and stable.
Apply engine v2 contract finalized.
Implementation steps:

Add AWS runtime abstraction with snapshot/live modes.
Extend adapter contract to support operation-level push semantics.
Upgrade AWS adapters to optional live mode while preserving snapshot determinism.
Expand contract tests for v2 semantics and partial-failure reporting.
Post-conditions:

pnpm --filter @xlameiro/env-typegen lint passes.
pnpm --filter @xlameiro/env-typegen type-check passes.
pnpm --filter @xlameiro/env-typegen test passes.
pnpm --filter @xlameiro/env-typegen build passes.
AWS adapters pass both snapshot mode and live-mode contract checks.
Phase 19 — AWS Runtime Live Mode and Adapter Contract V2
Scope

File Action
packages/env-typegen/src/adapters/aws-runtime.ts Create
types.ts Modify
testkit.ts Modify
aws-ssm-adapter.ts Modify
aws-secrets-manager-adapter.ts Modify
packages/env-typegen/tests/adapters/aws-runtime.test.ts Create
testkit.test.ts Modify
aws-ssm-adapter.test.ts Modify
aws-secrets-manager-adapter.test.ts Modify
Pre-conditions

Phase 18 completa.
Contrato apply v2 definido.
Guardrails enterprise activos.
Implementation steps

Crear AWS runtime abstraction.
Añadir live mode opcional por config.
Mantener snapshot mode para CI determinista.
Endurecer contract testkit con v2 semantics.
Post-conditions

pnpm --filter @xlameiro/env-typegen lint
pnpm --filter @xlameiro/env-typegen type-check
pnpm --filter @xlameiro/env-typegen test
pnpm --filter @xlameiro/env-typegen build
Adapters AWS muestran comportamiento coherente y auditable en modos snapshot/live.
Continuation Prompt
Phase 19 of env-typegen governance part 5 is complete.

What was done in Phase 19:

Introduced AWS runtime abstraction and optional live mode.
Upgraded adapter contract/testkit to v2 operation semantics.
Hardened AWS adapter tests for snapshot and live-compatible behavior.
Checkpoint saved to vscode/memory key: phase-19-complete.
Quality gate: lint passed, type-check passed, test passed, build passed.
Continue with Phase 20: Policy Pack Locking and Remote Distribution Controls.

Phase 20 scope:

Scope:

Create packages/env-typegen/src/policy/policy-pack-lock.ts
Create packages/env-typegen/src/policy/policy-pack-fetch.ts
Modify policy-pack.ts
Modify policy-pack-registry.ts
Modify config.ts
Create packages/env-typegen/tests/policy/policy-pack-lock.test.ts
Create packages/env-typegen/tests/policy/policy-pack-fetch.test.ts
Modify policy-pack.test.ts
Create packages/env-typegen/tests/fixtures/policy/packs/enterprise-baseline.policy.json
Create packages/env-typegen/tests/fixtures/policy/packs/enterprise-production.policy.json
Pre-conditions:

Phase 19 completed and stable.
Existing pack precedence behavior preserved.
Implementation steps:

Add lockfile model for pack integrity pinning.
Add resilient remote fetch with timeout/retry/cache behavior.
Integrate lock validation into registry resolution flow.
Expand pack fixtures/tests for enterprise layering scenarios.
Post-conditions:

pnpm --filter @xlameiro/env-typegen lint passes.
pnpm --filter @xlameiro/env-typegen type-check passes.
pnpm --filter @xlameiro/env-typegen test passes.
pnpm --filter @xlameiro/env-typegen build passes.
Policy pack resolution supports deterministic locked execution.
Phase 20 — Policy Pack Locking and Remote Distribution Controls
Scope

File Action
packages/env-typegen/src/policy/policy-pack-lock.ts Create
packages/env-typegen/src/policy/policy-pack-fetch.ts Create
policy-pack.ts Modify
policy-pack-registry.ts Modify
config.ts Modify
packages/env-typegen/tests/policy/policy-pack-lock.test.ts Create
packages/env-typegen/tests/policy/policy-pack-fetch.test.ts Create
policy-pack.test.ts Modify
packages/env-typegen/tests/fixtures/policy/packs/enterprise-baseline.policy.json Create
packages/env-typegen/tests/fixtures/policy/packs/enterprise-production.policy.json Create
Pre-conditions

Phase 19 completada.
Policy precedence actual estable.
CI baseline verde.
Implementation steps

Diseñar lockfile de policy packs.
Añadir fetch resiliente y cache local.
Integrar lock y fallback offline.
Probar drift de integridad y rutas de error.
Post-conditions

pnpm --filter @xlameiro/env-typegen lint
pnpm --filter @xlameiro/env-typegen type-check
pnpm --filter @xlameiro/env-typegen test
pnpm --filter @xlameiro/env-typegen build
Registry de packs funciona de forma reproducible entre entornos.
Continuation Prompt
Phase 20 of env-typegen governance part 5 is complete.

What was done in Phase 20:

Added policy pack lock and resilient remote fetch controls.
Integrated locked policy resolution with offline-safe behavior.
Extended fixtures and tests for enterprise pack layering.
Checkpoint saved to vscode/memory key: phase-20-complete.
Quality gate: lint passed, type-check passed, test passed, build passed.
Continue with Phase 21: CI Promotion Pipeline and Governance Summaries.

Phase 21 scope:

Scope:

Create .github/workflows/env-governance-promotion.yml
Create qa-test/env-typegen-governance-promotion-smoke.mjs
Create packages/env-typegen/src/reporting/governance-summary.ts
Modify env-governance-smoke.yml
Modify env-governance-apply-dry-run.yml
Modify env-governance-apply.yml
Modify env-typegen-governance-smoke.mjs
Modify env-typegen-apply-smoke.mjs
Modify sync-apply-command.ts
Modify sync-apply-command.test.ts
Pre-conditions:

Phase 20 completed and stable.
Guardrails, apply-v2, and pack-lock behavior verified.
Implementation steps:

Introduce staged governance promotion workflow.
Add promotion smoke script and summary artifacts.
Align command outputs for CI consumption across all governance commands.
Validate deterministic pass/fail paths in CI workflow tests.
Post-conditions:

pnpm lint passes.
pnpm type-check passes.
pnpm test passes.
pnpm build passes.
Promotion workflow enforces dry-run/enforce/apply gates deterministically.
Phase 21 — CI Promotion Pipeline and Governance Summaries
Scope

File Action
.github/workflows/env-governance-promotion.yml Create
qa-test/env-typegen-governance-promotion-smoke.mjs Create
packages/env-typegen/src/reporting/governance-summary.ts Create
env-governance-smoke.yml Modify
env-governance-apply-dry-run.yml Modify
env-governance-apply.yml Modify
env-typegen-governance-smoke.mjs Modify
env-typegen-apply-smoke.mjs Modify
sync-apply-command.ts Modify
sync-apply-command.test.ts Modify
Pre-conditions

Phase 20 completa.
Workflows actuales funcionando.
Artefactos smoke consolidados.
Implementation steps

Crear pipeline de promoción por etapas.
Unificar resumen de gobernanza para CI.
Endurecer smoke scripts en rutas fail esperadas.
Integrar verificaciones de promoción en PR y main.
Post-conditions

pnpm lint
pnpm type-check
pnpm test
pnpm build
Pipeline de promoción genera artefactos comparables entre runs.
Continuation Prompt
Phase 21 of env-typegen governance part 5 is complete.

What was done in Phase 21:

Added staged governance promotion workflow.
Introduced unified governance summaries and promotion smoke checks.
Hardened CI dry-run/apply workflows with deterministic promotion gates.
Checkpoint saved to vscode/memory key: phase-21-complete.
Quality gate: lint passed, type-check passed, test passed, build passed.
Continue with Phase 22: Documentation and Multi-Repo Adoption Closure.

Phase 22 scope:

Scope:

Create docs/roadmap/infra-governance-part5-roadmap.md
Create content/docs/governance-promotion.mdx
Create packages/env-typegen/docs/governance-promotion.md
Modify infra-governance-roadmap.md
Modify README.md
Modify README.md
Modify operations.mdx
Modify validation.mdx
Modify api.mdx
Pre-conditions:

Phase 21 completed and stable.
Promotion pipeline and artifacts verified.
Implementation steps:

Publish Part 5 roadmap with KPIs, risks, and go/no-go criteria.
Document promotion model and enterprise runbooks across all docs surfaces.
Align root/package/site documentation and remove narrative drift.
Post-conditions:

pnpm lint passes.
pnpm type-check passes.
pnpm test passes.
pnpm build passes.
Documentation is consistent across root/package/site and ready for multi-repo adoption.
Phase 22 — Documentation and Multi-Repo Adoption Closure
Scope

File Action
docs/roadmap/infra-governance-part5-roadmap.md Create
content/docs/governance-promotion.mdx Create
packages/env-typegen/docs/governance-promotion.md Create
infra-governance-roadmap.md Modify
README.md Modify
README.md Modify
operations.mdx Modify
validation.mdx Modify
api.mdx Modify
Pre-conditions

Phase 21 completada.
Promotion CI validado.
Runbooks técnicos listos.
Implementation steps

Publicar roadmap Parte 5.
Documentar promoción y adopción multi-repo.
Sincronizar documentación entre superficies.
Post-conditions

pnpm lint
pnpm type-check
pnpm test
pnpm build
Cierre formal de Parte 5 con riesgos residuales explícitos y plan de evolución Parte 6.
Data Flow
User or CI ejecuta plan o sync-preview.
Plan/sync-preview generan changeSet + preflight proof correlado.
Sync-apply valida proof + guardrails + policy decision antes de mutar.
Apply-engine-v2 ejecuta operaciones y clasifica resultados.
Audit writer registra lifecycle events con redacción central.
Governance summary unifica resultado para consola, JSON y artefactos CI.
Workflows de promoción deciden avance de etapa según evidencia determinista.
Testing Plan
Unit tests (Vitest): preflight proof validation, write-guards v2, apply-engine-v2, redaction, policy-pack-lock y fetch.
Command tests (Vitest): sync-apply hardening, plan/sync-preview correlation, exit codes deterministas.
Adapter tests (Vitest): AWS snapshot/live modes, contrato v2, errores parciales.
Workflow smoke (Node scripts): governance smoke, apply smoke, promotion smoke con rutas pass/fail esperadas.
Regression suite: asegurar cero regresiones en generate/check/diff/doctor/verify/pull.
Quality gate por fase y global: lint, type-check, test, build.
Open Questions
El modo live de AWS adapters debe activarse solo por flag de CLI, solo por config o por ambos.
El lockfile de policy packs debe ser obligatorio en protected environments o configurable por repo.
Para promotion pipeline, si se habilita una ventana de override manual, qué evidencia mínima debe exigirse.
Se requiere persistencia de audit trail fuera de artefactos CI (por ejemplo, destino centralizado) en esta Parte 5 o se difiere a Parte 6.
El confirmation token de apply debe ser rotativo por ejecución o reutilizable por ventana temporal corta.
Coverage Report
Category Detail
Directories examined 10 de 10 dominios relevantes para continuación (packages/env-typegen/src, packages/env-typegen/tests, .copilot/checkpoints, docs/roadmap, .github/workflows, qa-test, content/docs, packages/env-typegen/docs, README surfaces, big_plan artifacts)
Files fully read 34
Domains fully covered checkpoints de fases 8–16, comandos governance, sync core, audit core, policy packs, adapters AWS, smoke scripts, workflows apply/smoke, roadmap actual
Domains skipped / not read generadores/parser/inferrer internos no governance; no bloquean continuación Parte 5
Estimated coverage 86% para alcance de continuación governance enterprise
Si se requiere 100% de cobertura para auditoría total del monorepo, hay que abrir una sesión dedicada de auditoría global fuera de este alcance.

Confidence and Limits
Confidence level: High
Reason for confidence gap: no se inspeccionó código no relacionado con governance runtime (generators/parsers), porque el objetivo es continuación post-Fase 16.
Key assumptions:
Se mantiene postura read-only por defecto.
La evolución a live AWS será opt-in y reversible.
Los artifacts JSON/JSONL seguirán siendo fuente de verdad de CI.
Residual risks:
Complejidad adicional de contrato adapter v2 puede requerir migración gradual de adapters de terceros.
Locking estricto de packs puede introducir fricción inicial en equipos con repos legacy.
Promotion pipeline mal parametrizado podría bloquear despliegues legítimos.
Session limit reached: No
