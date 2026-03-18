## Governance Trust Model

Trust enforcement ensures policy packs and governance decisions are validated before promotion or apply.

## Layers

1. Signature checksum validation.
2. Keyring and revocation validation.
3. Deterministic trust policy outcomes.
4. CI gate assertions for promotion/apply workflows.

## Workflows

- `.github/workflows/env-governance-promotion.yml`
- `.github/workflows/env-governance-apply-dry-run.yml`
- `.github/workflows/env-governance-apply.yml`
- `.github/workflows/env-governance-forensics.yml`

## Operational recommendation

Keep trust validation mandatory for PR and protected-branch governance pipelines.
Treat missing or invalid signatures as blocking conditions in promotion and apply stages.
