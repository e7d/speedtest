FROM node:10-alpine

LABEL maintainer='Michaël "e7d" Ferrand <michael@e7d.io>'

WORKDIR /app
COPY server /opt/speedtest/server
COPY web /opt/speedtest/web

RUN ( cd /opt/speedtest/server && npm run prod ) && \
    mv /opt/speedtest/server/* /app/ && \
    ( cd /opt/speedtest/web && npm run prod ) && \
    mv /opt/speedtest/web/dist/* /app/web && \
    npm cache clean --force && \
    rm -rf /opt/speedtest && \
    rm -rf /root/.npm/node-sass && \
    rm -rf /tmp/*

EXPOSE 80
CMD [ "node", "server.js" ]
