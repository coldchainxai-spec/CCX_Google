# Production Dockerfile for Google Cloud Run (Root context)
FROM node:20-alpine AS builder

WORKDIR /app
COPY control-tower/package*.json ./
RUN npm ci
COPY control-tower/ ./
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY control-tower/package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/data ./src/data
COPY control-tower/server.js ./

EXPOSE 8080
CMD ["node", "server.js"]
