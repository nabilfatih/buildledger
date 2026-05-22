# Environment

BuildLedger keeps application data in Convex. Normal product reads and writes should use Confect/Convex functions, not REST endpoints.

## Required

```bash
CONVEX_DEPLOYMENT=
VITE_CONVEX_URL=
```

`VITE_CONVEX_URL` is used by the TanStack Start client. For local development, Convex usually prints this URL after `pnpm --filter @repo/backend dev`.

## AI

```bash
AI_MODEL=open-source-demo-model
AI_GATEWAY_API_KEY=
```

The V1 AI services are deterministic Effect services so the app can run without provider setup. Real provider calls should stay behind `Effect.Service` implementations in `packages/ai`.

## Rules

- Do not read `process.env` inside domain logic.
- Use Effect `Config.*` inside AI services.
- Keep secrets out of client-exposed `VITE_*` variables.
