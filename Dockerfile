FROM node:10-alpine

LABEL maintainer='Michaël "e7d" Ferrand <michael@e7d.io>'

WORKDIR /app
COPY assets/fonts /usr/share/fonts
COPY server /opt/speedtest/server
COPY web /opt/speedtest/web

RUN apk add --no-cache \
        imagemagick \
 && apk add --no-cache --virtual .build-deps \
        fontconfig \
 && fc-cache -f -v \
 && ( cd /opt/speedtest/server && npm run prod ) \
 && mv /opt/speedtest/server/* /app/ \
 && ( cd /opt/speedtest/web && npm run prod ) \
 && mv /opt/speedtest/web/dist/* /app/web/ \
 && mkdir -p /app/results \
 && npm cache clean --force \
 && rm -rf /opt/speedtest \
 && rm -rf /root/.npm/node-sass \
 && rm -rf /tmp/* \
 && apk del .build-deps

EXPOSE 80
CMD [ "node", "server.js" ]
