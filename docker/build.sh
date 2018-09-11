#!/bin/sh

build()
{
    webBuild
    dockerBuild
}

dockerBuild()
{
    webBuild
    docker build --no-cache -t e7db/speedtest:$1 -f $PWD/docker/$1.Dockerfile $PWD
}

webBuild()
{
    docker run -it --rm --user $(id -u):$(id -g) -v $PWD/web:/app -w /app node:10-alpine npm run prod
}

cd `dirname $0`/..
cmd=$1
while true; do
    case $cmd in
        "go") dockerBuild go; break;;
        "node") dockerBuild node; break;;
        "php") dockerBuild php; break;;
        "python") dockerBuild php; break;;
        * ) echo "Please answer \"go\", \"node\", \"php\" or \"python\".";;
    esac
    read -p "What to build? " cmd
done

