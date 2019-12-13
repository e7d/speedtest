FROM node:lts-alpine

LABEL maintainer='Michaël "e7d" Ferrand <michael@e7d.io>'

WORKDIR /app

COPY assets/fonts/ /usr/share/fonts/
COPY packages/server/assets/ /opt/speedtest/server/assets/
COPY packages/server/certificates/ /opt/speedtest/server/certificates/
COPY packages/server/src/ /opt/speedtest/server/src/
COPY packages/server/package.json /opt/speedtest/server/package.json
COPY packages/server/package-lock.json /opt/speedtest/server/package-lock.json
COPY packages/server/server.js /opt/speedtest/server/server.js
COPY packages/web/build/ /opt/speedtest/web/build/
COPY packages/web/src/ /opt/speedtest/web/src/
COPY packages/web/.babelrc /opt/speedtest/web/.babelrc
COPY packages/web/package.json /opt/speedtest/web/package.json
COPY packages/web/package-lock.json /opt/speedtest/web/package-lock.json
COPY packages/web/webpack.common.js /opt/speedtest/web/webpack.common.js
COPY packages/web/webpack.config.js /opt/speedtest/web/webpack.config.js
COPY packages/web/webpack.prod.js /opt/speedtest/web/webpack.prod.js

RUN apk add --no-cache \
        imagemagick \
 && apk add --no-cache --virtual .build-deps \
        fontconfig \
 && fc-cache -f -v \
 && ( cd /opt/speedtest/server && npm ci --production ) \
 && ( cd /opt/speedtest/web && npm ci && npm run build ) \
 && mkdir -p /app/results /app/web \
 && mv /opt/speedtest/server/* /app/ \
 && mv /opt/speedtest/web/dist/* /app/web/ \
 && npm cache clean --force \
 && rm -rf /opt/speedtest \
 && rm -rf /root/.npm/node-sass \
 && rm -rf /tmp/* \
 && apk del .build-deps

EXPOSE 80

VOLUME [ "/app/results" ]

CMD [ "node", "server.js" ]
