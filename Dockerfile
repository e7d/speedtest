FROM node:10-alpine

LABEL maintainer='Michaël "e7d" Ferrand <michael@e7d.io>'

WORKDIR /app

COPY assets/fonts /usr/share/fonts
COPY packages/server /opt/speedtest/server
COPY packages/web /opt/speedtest/web

RUN apk add --no-cache \
        imagemagick \
 && apk add --no-cache --virtual .build-deps \
        fontconfig \
 && fc-cache -f -v \
 && mkdir -p /app/results \
 && mkdir -p /app/web \
 && ( cd /opt/speedtest/server && npm run dist ) \
 && mv /opt/speedtest/server/* /app/ \
 && ( cd /opt/speedtest/web && npm run dist ) \
 && mv /opt/speedtest/web/dist/* /app/web/ \
 && npm cache clean --force \
 && rm -rf /opt/speedtest \
 && rm -rf /root/.npm/node-sass \
 && rm -rf /tmp/* \
 && apk del .build-deps

EXPOSE 80

VOLUME [ "/app/results" ]

CMD [ "node", "server.js" ]
