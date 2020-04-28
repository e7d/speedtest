FROM node:lts-alpine AS build

WORKDIR /app

COPY lerna.json /app/lerna.json
COPY package.json /app/package.json
COPY package-lock.json /app/package-lock.json
COPY packages /app/packages

RUN apk add --no-cache \
  g++ \
  make \
  python3 \
  && npm run setup \
  && npm run build

FROM node:lts-alpine

LABEL maintainer='Michaël "e7d" Ferrand <michael@e7d.io>'

WORKDIR /app

COPY assets/fonts/ /usr/share/fonts/
COPY --from=build /app/packages/server /app
COPY --from=build /app/packages/web/dist /app/web

RUN apk add --no-cache imagemagick \
  && apk add --no-cache --virtual .build-deps fontconfig \
  && fc-cache -f -v \
  && apk del .build-deps \
  && rm -rf /var/cache/apk/*

EXPOSE 80

VOLUME [ "/app/results" ]

CMD [ "node", "server.js" ]
