FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY nx.json tsconfig*.json ./
COPY apps/ apps/
COPY models/ models/
COPY auth/ auth/
COPY data-access/ data-access/
COPY tasks/ tasks/
COPY users/ users/
COPY analytics/ analytics/
COPY utils/ utils/

RUN npm ci
RUN npx nx build api --configuration=production

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/dist/apps/api ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

CMD ["node", "dist/main.js"]
