#!/bin/sh

# Move to project root
cd `dirname $0`/..

# Clean previous Web UI build
rm -rf $PWD/web/dist
rm -rf $PWD/web/node_modules

# Build latest version of Web UI
docker run --rm --user $(id -u):$(id -g) -v $PWD/web:/app -w /app node:10-alpine npm run prod
docker build -t e7db/speedtest:php -f php.Dockerfile .
