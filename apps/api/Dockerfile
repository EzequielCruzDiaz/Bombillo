# Imagen de la API. Se construye desde la raíz del monorepo:
#   docker build -f apps/api/Dockerfile -t bombillo-api .
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/domain/package.json packages/domain/
COPY packages/data/package.json packages/data/
RUN pnpm install --frozen-lockfile --filter @bombillo/api...

FROM deps AS runtime
COPY tsconfig.base.json ./
COPY packages/domain packages/domain
COPY packages/data packages/data
COPY apps/api apps/api
ENV NODE_ENV=production
USER node
EXPOSE 4000
CMD ["pnpm", "--filter", "@bombillo/api", "start"]
