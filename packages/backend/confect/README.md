# Confect source

This directory is the source of truth for the backend API. Confect generates the corresponding Convex functions into `../convex`.

Rules:

- Define tables with Effect schemas.
- Define API specs before implementation.
- Use default Convex actions unless a dependency truly requires the Node runtime.
- Do not manually edit generated files under `confect/_generated`.
- Do not manually edit generated Convex files except `convex.config.ts` and `tsconfig.json`.
