FROM golang:1-alpine

LABEL maintainer='Michaël "e7d" Ferrand <michael@e7d.io>'

WORKDIR /app
COPY server/go/* ./
COPY web/dist ./web

RUN go build -o serve server.go \
    && rm server.go

EXPOSE 80
CMD [ "./server", "80", "web" ]
