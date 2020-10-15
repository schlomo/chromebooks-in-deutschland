FROM node:alpine as builder
ADD . /work/
WORKDIR /work
RUN find . && yarn install && yarn run prep && chmod -R o+rX .

FROM node:alpine
WORKDIR /work
COPY --from=builder /work/functions /work
VOLUME /config
ENV FIREBASE_CONFIG=/config/config.json
ENV GOOGLE_APPLICATION_CREDENTIALS=/config/credentials.json
CMD ["node", "standalone.js"]
