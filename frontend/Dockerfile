FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S solaris && adduser -S solaris -G solaris
COPY --from=builder --chown=solaris:solaris /app/public ./public
COPY --from=builder --chown=solaris:solaris /app/.next/standalone ./
COPY --from=builder --chown=solaris:solaris /app/.next/static ./.next/static
USER solaris
EXPOSE 3000
CMD ["node", "server.js"]
