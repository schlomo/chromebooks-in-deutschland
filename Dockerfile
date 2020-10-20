FROM node:alpine as builder
ADD . /work/
WORKDIR /work
RUN apk add --no-cache bash git && \
    yarn install && \
    yarn run prep && \
    chmod -R o+rX .
RUN git status --porcelain ; find .

FROM node:alpine
WORKDIR /work
COPY --from=builder /work/functions /work
VOLUME /config
ENV FIREBASE_CONFIG=/config/config.json
ENV GOOGLE_APPLICATION_CREDENTIALS=/config/credentials.json
CMD ["node", "standalone.js"]
