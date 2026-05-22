# Environment

BuildLedger keeps application data in Convex. Normal product reads and writes should use Confect/Convex functions, not REST endpoints.

## Required

```bash
CONVEX_DEPLOYMENT=
VITE_CONVEX_URL=
BUILDLEDGER_PUBLIC_CONVEX_URL=
BUILDLEDGER_DEV_AUTH=
BUILDLEDGER_SECRET_KEY=
```

`VITE_CONVEX_URL` is still accepted for Convex CLI deploy workflows. `BUILDLEDGER_PUBLIC_CONVEX_URL` is the runtime public URL used by the TanStack Start web container. For local development, Convex usually prints this URL after `pnpm --filter @repo/backend dev`.

The default local URL is `http://127.0.0.1:3210`.

`BUILDLEDGER_DEV_AUTH=enabled` is only for the local Convex dev server. It gives contributors a shared local demo identity so they can exercise the full product flow without configuring a hosted auth provider first. Do not set it for production deployments.

## AI

```bash
BUILDLEDGER_AI_PROVIDER=demo
BUILDLEDGER_AI_MODEL=openai/gpt-5-mini
OPENROUTER_API_KEY=
```

The AI layer resolves providers in this order:

- encrypted user OpenRouter key from the AI settings sheet
- `OPENROUTER_API_KEY` when `BUILDLEDGER_AI_PROVIDER=openrouter`
- deterministic demo provider

`BUILDLEDGER_SECRET_KEY` must be at least 32 characters before users can save BYOK keys. Keep it stable for the deployment; changing it makes previously encrypted user keys unreadable.

## Rules

- Do not read `process.env` inside domain logic.
- Use Effect `Config.*` inside AI services.
- Keep secrets out of client-exposed `VITE_*` variables.
- Keep `BUILDLEDGER_PUBLIC_CONVEX_URL` public-safe; browsers use it directly.
