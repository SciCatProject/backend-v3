#!/usr/bin/env bash
#
# script filename
SCRIPT_NAME=$(basename $BASH_SOURCE)
echo ""
echo ""

# -------
# display help 
displayHelp() {
    echo "Usage ${SCRIPT_NAME} [-h] [-g tag] [-i tag] [-d]"
    echo ""
    echo " prepare a docker image and push it to the dockerhub repo "
    echo " in repository scicatproject/backend with tag specified by -i option"
    echo ""
    echo " arguments:"
    echo " -h        : show this help and exit"
    echo " -g tag    : git tag or commit we would like to use to create the docker image."
    echo "             If not specified, the program will used the latest commit in the current git branch"
    echo " -i tag    : tag used to tag the docker image"
    echo "             If not specified, the docker imag ewill be tagged with "
    echo "             the git branch name followed by git tag, separted by dash"
    echo "             Example:"
    echo "             - master-5d5f42af1ca6816a13b6db60b4778388dc4bf431"
    echo " -d        : dry run. Check and print arguments and commands but does not take any action"
    echo ""
}


# internal variables
#
# git tag
gitTag=""
# git repo
gitRepo=""
# docker image tag
dockerTag=""
# docker repository
dockerRepo=scicatproject/backend
# dry run
dryRun="n"

#
# manage options
while getopts "hdg:i:" option; do
    case $option in 
        h) # display help
            displayHelp
            exit 0
            ;;
        g) # user specified the git tag to use
            gitTag=${OPTARG}
            ;;
        i) # user specified the docke rimage tag to use
            dockerTag=${OPTARG}
            ;;
        d) # dry run
            dryRun="y"
            ;;
        \?) # invalid option
            echo "Invalid Option"
            echo
            displayHelp
            exit 1
            ;;
    esac
done

# code repository and branch
# these are not needed anymore as we assume that this script will only be run from within the repo
# after it has been cloned from github.
#
# I leave them here as a reference as they change as of 2021/11/09
# githut repository = https://github.com/scicatproject/frontend.git
# available branches
# - master,


gitRepo="$(git branch --show-current)"
# check if the user provided a tag or not
if [ "-${gitTag}-" == "--" ]; then
    # not git tag from the user
    # define git tag as <branch>-<latest commit>
    gitTag="$(git rev-parse HEAD)"
else
    # check out on the specific commit or tag
    git checkout ${gitTag}
fi


# docker image tag
if [ "${dockerTag}-" == "--" ]; then
    dockerTag="${gitRepo}-${gitTag}"
fi

dockerImage="${dockerRepo}:${dockerTag}"

#
# gives some feedback to the user
echo "Git repo         : ${gitRepo}"
echo "Git commit tag   : ${gitTag}"
echo "Docker image tag : ${dockerTag}"
echo "Docker image     : ${dockerImage}"
echo ""

if [ "-${dryRun}-" == "-y-" ]; then
    echo "Dry Run. Exiting"
    exit 0
fi


#
# create docker image
# if it is already present, remove old image
if [[ "$(docker images -q ${dockerImage} 2> /dev/null)" != "" ]]; then
    echo "Image already present. Removing it and recreating it"
    docker rmi ${dockerImage}
    echo ""
fi
echo "Creating image"
docker build -t ${dockerImage} -f CI/ESS/Dockerfile .
echo ""

# push image on docker hub repository
docker push ${dockerImage}
echo ""
echo "Done"
echo ""


