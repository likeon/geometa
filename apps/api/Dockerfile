FROM oven/bun:1 AS build
WORKDIR /usr/src/app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY . .
RUN bun run build

FROM build as release

COPY --from=build /usr/src/app/node_modules node_modules
COPY --from=build /usr/src/app/package.json /usr/src/app/build/index.js  ./

USER bun
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "run", "index.js" ]
