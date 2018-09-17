FROM python:2-alpine

LABEL maintainer='Michaël "e7d" Ferrand <michael@e7d.io>'

WORKDIR /app
COPY server/python/* ./
COPY web/dist ./web

EXPOSE 80
CMD [ "python", "server.py", "80", "web" ]
