FROM node:11

WORKDIR /subprocess

COPY package.json yarn.lock ./

RUN yarn

COPY . .