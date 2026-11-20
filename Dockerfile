FROM node:24-alpine AS base
RUN apk add --no-cache libgcc libstdc++
COPY --from=oven/bun:1.4.4-alpine /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app

FROM base AS dependencies
COPY package.json bun.lock turbo.json tsconfig.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/ai/package.json packages/ai/package.json
COPY packages/backend/package.json packages/backend/package.json
COPY packages/design-system/package.json packages/design-system/package.json
COPY packages/testing/package.json packages/testing/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json
RUN bun install --frozen-lockfile

FROM dependencies AS build
COPY . .
RUN bun run --filter @repo/backend codegen
RUN bun run --filter web build

FROM node:24-alpine AS runtime
ENV HOST="0.0.0.0"
ENV NODE_ENV="production"
ENV PORT="3000"
WORKDIR /app
COPY --from=build --chown=node:node /app/apps/web/.output ./.output
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
