FROM golang:1-alpine

LABEL maintainer='Michaël "e7d" Ferrand <michael@e7d.io>'

WORKDIR /app
COPY server/go/* ./
COPY web/dist ./web

EXPOSE 80
CMD [ "go", "run", "main.go", "80", "web" ]
