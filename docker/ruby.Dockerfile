FROM ruby:2-alpine

LABEL maintainer='Michaël "e7d" Ferrand <michael@e7d.io>'

WORKDIR /app
COPY server/ruby/* ./
COPY web/dist ./web

EXPOSE 80
CMD [ "ruby", "server.rb", "80", "web" ]
