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

## Convex

Run Convex setup from the backend package:

```bash
pnpm --filter @repo/backend convex:dev
```

Then copy the printed deployment values into `.env.local`.

## Production Shape

- Convex is the source of truth for organizations, projects, meetings, AI runs, reports, shares, and memory.
- TanStack Start serves the UI.
- AI provider code belongs behind Effect services in `packages/ai`.
- Generated Convex target files live under `packages/backend/convex`; edit Confect source under `packages/backend/confect`.

## License

BuildLedger is licensed as `AGPL-3.0-only`.
