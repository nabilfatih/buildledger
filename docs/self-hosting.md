# Self Hosting

## Local

```bash
pnpm install
pnpm --filter @repo/backend codegen
pnpm dev
```

`pnpm dev` starts the web app and backend package through Turbo. Use separate terminals if you want finer control:

```bash
pnpm dev:web
pnpm dev:backend
```

The backend dev script runs local Convex with `BUILDLEDGER_DEV_AUTH=enabled` so contributors can create projects, meetings, reports, and share links immediately. Production deployments should use a real auth provider and leave `BUILDLEDGER_DEV_AUTH` unset.

## Docker

Docker runs the TanStack Start web app from the Nitro build output. Convex still runs as the backend, either through Convex Cloud or a self-hosted Convex deployment.

```bash
cp .env.docker.example .env.docker
docker compose --env-file .env.docker up --build
```

Set `BUILDLEDGER_PUBLIC_CONVEX_URL` to the Convex deployment URL that browsers can reach. For local Convex, the default is `http://127.0.0.1:3210`.

AI runs in the Convex backend, not inside the web image. Set `BUILDLEDGER_AI_PROVIDER`, `BUILDLEDGER_AI_MODEL`, `OPENROUTER_API_KEY`, and `BUILDLEDGER_SECRET_KEY` on the Convex deployment when you want environment-level OpenRouter. Users can also save their own encrypted key from the AI settings sheet.

The image build is intentionally small:

- install workspace dependencies with `pnpm`
- generate the Convex target from Confect
- build the TanStack Start app
- copy only `apps/web/.output` into the runtime image

## Convex

Run Convex setup from the backend package:

```bash
pnpm --filter @repo/backend convex:dev
```

Then copy the printed deployment values into `.env.local`.

For production, deploy the backend before publishing the web image:

```bash
pnpm --filter @repo/backend codegen
pnpm --filter @repo/backend exec convex deploy
```

Convex's custom hosting flow sets `VITE_CONVEX_URL` during build. Docker deployments can instead pass `BUILDLEDGER_PUBLIC_CONVEX_URL` at runtime.

## Production Shape

- Convex is the source of truth for organizations, projects, meetings, AI runs, reports, shares, and memory.
- TanStack Start serves the UI.
- AI provider code belongs behind Effect services in `packages/ai`; OpenRouter is the default BYOK path and demo remains the no-key fallback.
- Generated Convex target files live under `packages/backend/convex`; edit Confect source under `packages/backend/confect`.

## License

BuildLedger is licensed as `AGPL-3.0-only`.
