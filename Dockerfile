FROM node:22-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY tsconfig.json ./
COPY src ./src
RUN pnpm run build

FROM base AS runtime
ENV NODE_ENV="production"

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

COPY --from=build /app/dist ./dist

EXPOSE 4000
CMD ["node", "dist/main.js"]
