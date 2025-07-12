FROM node:22-alpine AS builder
# @sveltejs/enhanced-img needs it
RUN apk add --no-cache vips-dev
RUN mkdir -p /app && chown -R node:node /app
WORKDIR /app
USER node
COPY --chown=node:node package*.json ./
RUN npm ci
COPY --chown=node:node . .
RUN NODE_OPTIONS="--max-old-space-size=4096" npm run build
RUN npm prune --production

FROM node:22-alpine
RUN apk add --no-cache dumb-init
RUN mkdir -p /app && chown -R node:node /app
WORKDIR /app
USER node
COPY --from=builder --chown=node:node /app/build build/
COPY --from=builder --chown=node:node /app/node_modules node_modules/
COPY --chown=node:node package.json .
EXPOSE 3000
ENV NODE_ENV=production
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "build"]
