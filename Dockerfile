# gives a docker image below 200 MB
FROM node:16-alpine

ENV NODE_ENV "production"
ENV PORT 3000
EXPOSE 3000
RUN addgroup mygroup && adduser -D -G mygroup myuser && mkdir -p /usr/src/app && chown -R myuser /usr/src/app

WORKDIR /usr/src/app
COPY package*.json ./

USER myuser
RUN npm ci --production

COPY . /usr/src/app

CMD ["node", "."]
