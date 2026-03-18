## Policy Packs

Policy packs let teams reuse governance rules across repositories with deterministic precedence.

### Precedence order

1. Inline local policy in `env-typegen.config.mjs`
2. Overlay packs
3. Base packs

### Config snippet

```typescript
export default {
  policy: {
    packs: {
      base: ["./policy/base-governance.policy.json"],
      overlay: ["./policy/production-strict.policy.json"],
    },
  },
};
```

### Pack format

```json
{
  "id": "base-governance",
  "version": 1,
  "layer": "base",
  "policy": {
    "defaults": {
      "onClean": "allow",
      "onWarnings": "block",
      "onErrors": "block"
    },
    "rules": []
  }
}
```

### Operational guidance

- Keep packs versioned and reviewed.
- Prefer shared base packs for organization-wide defaults.
- Use overlay packs for stricter production controls.
- Keep inline overrides minimal and explicit.
