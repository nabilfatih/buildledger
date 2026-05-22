# BuildLedger

Open-source AI meeting OS for construction project memory.

BuildLedger is an ethical, open-source alternative for construction meeting operations. It is inspired by public construction-tech product patterns, but it does not copy Alago branding, content, private workflows, UI, or visual assets.

The current implementation is a Convex-first V1 foundation:

- create organizations and projects from authenticated Convex identity
- create meeting drafts, add notes/transcripts, and generate AI minutes drafts
- persist AI run events for realtime progress panels
- review generated sections and items before publishing
- publish minutes into actions, decisions, risks, and memory chunks
- generate weekly report drafts from project memory
- create and resolve read-only share links
- render a TanStack Start workspace with Coss UI and Evil Charts

## Stack

- TanStack Start for the web app
- Convex as the realtime source of truth
- Confect for Effect schemas, Convex specs, and typed React hooks
- Effect for AI/business logic
- Coss UI for components
- Evil Charts/Recharts for charts

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
- Evil Charts: https://evilcharts.com/docs

## Local Development

```bash
pnpm install
pnpm --filter @repo/backend codegen
pnpm dev
```

Copy `.env.example` to `.env.local` before running the app. The web app runs on `http://127.0.0.1:3000`.

## Repository Layout

```txt
apps/web                  TanStack Start app
packages/backend          Confect source and Convex target output
packages/ai               Effect services and schemas
packages/design-system    Coss UI and Evil Charts exports
packages/testing          Shared test helpers
packages/typescript-config
```

## More Docs

- [Environment](docs/environment.md)
- [Self Hosting](docs/self-hosting.md)
- [Contributing](CONTRIBUTING.md)
