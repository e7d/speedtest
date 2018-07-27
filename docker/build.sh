#!/bin/sh


cd `dirname $0`/..

build()
{
    webBuild
    dockerBuild
}

dockerBuild()
{
    docker build -t e7db/speedtest:$1 -f $1.Dockerfile .
}

webBuild()
{
    docker run -it --rm --user $(id -u):$(id -g) -v $PWD/web:/app -w /app node:10-alpine npm run prod
}

cmd=$1
while true; do
    case $cmd in
        "node") webBuild; dockerBuild node; break;;
        "php") webBuild; dockerBuild php; break;;
        * ) echo "Please answer \"node\" or \"php\".";;
    esac
    read -p "What to build? " cmd
done

