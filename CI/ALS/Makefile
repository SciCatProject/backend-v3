REGISTRY		:= registry.nersc.gov
PROJECT 		:= als
REGISTRY_NAME	:= ${REGISTRY}/${PROJECT}/${IMG}

NAME_SCICAT_BACKEND  	:= scicat_backend
SCICAT_BACKEND_TAG    	:= $$(git -C ../../ describe --tags)
IMG_SCICAT_BACKEND      := ${NAME_SCICAT_BACKEND}:${SCICAT_BACKEND_TAG}
REGISTRY_SCICAT_BACKEND	:= ${REGISTRY}/${PROJECT}/${NAME_SCICAT_BACKEND}:${SCICAT_BACKEND_TAG}

# make -C CI/ALS <target>

.PHONY: build_scicat_backend push_scicat_backend 


build_scicat_backend:
	@echo "tagging to: " ${IMG_SCICAT_BACKEND}    ${REGISTRY_SCICAT_BACKEND}
	@docker build -t ${IMG_SCICAT_BACKEND} -f Dockerfile ../../
	@echo "tagging to: " ${IMG_SCICAT_BACKEND}    ${REGISTRY_SCICAT_BACKEND}
	@docker tag ${IMG_SCICAT_BACKEND} ${REGISTRY_SCICAT_BACKEND}
 
push_scicat_backend:
	@echo "Pushing " ${REGISTRY_SCICAT_BACKEND}
	@docker push ${REGISTRY_SCICAT_BACKEND}


login:
	@docker log -u ${DOCKER_USER} -p ${DOCKER_PASS}