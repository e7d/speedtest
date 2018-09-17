#!/bin/sh

build()
{
    # webBuild
    dockerBuild $1
}

dockerBuild()
{
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
        "go") build go; break;;
        "node") build node; break;;
        "php") build php; break;;
        "python") build python; break;;
        "ruby") build ruby; break;;
        * ) echo "Please answer \"go\", \"node\", \"php\", \"python\" or \"ruby\".";;
    esac
    read -p "What to build? " cmd
done

