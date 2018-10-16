#!/bin/sh

dockerBuild()
{
    docker build --no-cache -t e7db/speedtest:$2 -f $PWD/docker/$1.Dockerfile $PWD
}

webBuild()
{
    docker run -it --rm --user $(id -u):$(id -g) -v $PWD/web:/app -w /app node:10-alpine npm run prod
}

cd `dirname $0`/..
cmd=$1
tag=$2
if [ -z $tag ]; then
    tag=$cmd
fi
while true; do
    case $cmd in
        "go"|"node"|"php"|"python"|"ruby")
            dockerBuild $cmd $tag
            break
            ;;
        "web")
            webBuild
            break
            ;;
        * )
            echo "Please answer \"go\", \"node\", \"php\", \"python\", \"ruby\" or \"web\"."
            ;;
    esac
    read -p "What to build? " cmd
done

