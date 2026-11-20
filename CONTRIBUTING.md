# Contributing

BuildLedger is Convex-first and Effect-first.

## Local Checks

```bash
bun run lint
bun run --filter @repo/backend codegen
bun run --filter @repo/backend typecheck
bun run --filter @repo/ai typecheck
bun run --filter @repo/ai test
bun run --filter @repo/design-system typecheck
bun run --filter web typecheck
bun run --filter web build
```

## Code Rules

- Keep domain logic in Confect functions or Effect services.
- Use typed Confect specs for public/internal APIs.
- Add schemas for function args, returns, and expected errors.
- Do not manually edit generated Convex files under `packages/backend/convex`.
- Use Coss UI components from `packages/design-system`.
- Use Evil Charts for charts.
- Keep custom styling limited to layout composition and global setup.

## Product Boundaries

BuildLedger is not a visual or content clone of any company. Do not copy private workflows, branding, assets, or website text from third-party products.
