# BuildLedger

Open-source construction protocol intelligence for traceable project memory.

BuildLedger is an ethical, open-source alternative for construction protocol operations. It is inspired by public construction-tech product patterns, but it does not copy Alago branding, content, private workflows, UI, or visual assets.

The current implementation is a Convex-first V1 foundation:

- create organizations and projects from a self-hosted workspace identity or an authenticated Convex identity
- create protocol drafts with protocol number, date, type, location, agenda, and distribution list
- save notes/transcripts as protocol sources
- generate editable protocol sections and construction records
- publish protocols into ledger records, logbook events, and memory chunks
- generate weekly report drafts from project memory
- bring your own OpenRouter key, encrypted per user, with demo fallback
- create read-only share links for protocols, reports, ledger views, and logbook views
- render a dense TanStack Start workspace with Coss UI

## Stack

- TanStack Start for the web app
- Convex as the realtime source of truth
- Confect for Effect schemas, Convex specs, and typed React hooks
- Effect for AI/business logic
- TanStack AI with OpenRouter for BYOK provider calls
- Coss UI for components

## Docs Used

- TanStack Start: https://tanstack.com/start/latest/docs/framework/react
- Convex best practices: https://docs.convex.dev/understanding/best-practices/
- Convex vector search: https://docs.convex.dev/search/vector-search
- Convex file storage: https://docs.convex.dev/file-storage
- Confect: https://confect.dev/getting-started/introduction
- Confect React hooks: https://confect.dev/clients/react
- Coss UI: https://coss.com/ui/docs
- Coss skills: https://coss.com/ui/docs/skills
- Coss styling: https://coss.com/ui/docs/styling
- TanStack AI OpenRouter: https://tanstack.com/ai/latest/docs/adapters/openrouter
- Convex Better Auth for TanStack Start: https://labs.convex.dev/better-auth/framework-guides/tanstack-start

## Local Development

```bash
pnpm install
pnpm --filter @repo/backend codegen
pnpm dev
```

Copy `.env.example` to `.env.local` before running the app. The web app runs on `http://127.0.0.1:3000`.

## Docker

```bash
cp .env.docker.example .env.docker
docker compose --env-file .env.docker up --build
```

Docker serves the TanStack Start web app on `http://127.0.0.1:3000`. Set `BUILDLEDGER_PUBLIC_CONVEX_URL` to the Convex deployment URL that browsers can reach.

AI runs in Convex. Set `BUILDLEDGER_AI_PROVIDER=openrouter`, `OPENROUTER_API_KEY`, `BUILDLEDGER_AI_MODEL`, and `BUILDLEDGER_SECRET_KEY` on the backend deployment for environment-level AI, or use the in-app AI settings sheet for encrypted BYOK.

## Repository Layout

```txt
apps/web                  TanStack Start app
packages/backend          Confect source and Convex target output
packages/ai               Effect services and schemas
packages/design-system    Coss UI exports
packages/testing          Shared test helpers
packages/typescript-config
```

## More Docs

- [Environment](docs/environment.md)
- [Self Hosting](docs/self-hosting.md)
- [Contributing](CONTRIBUTING.md)
