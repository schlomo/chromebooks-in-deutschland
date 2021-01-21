FROM node as builder
ARG VERSION
ADD . /work/
WORKDIR /work
# RUN apk add --no-cache bash python3 && \
#     yarn install && \
#     yarn run prep && \
RUN yarn install && \
    yarn run prep && \
    chmod -R o+rX .

FROM node:alpine
WORKDIR /work
COPY --from=builder /work/functions /work
VOLUME /config
ENV FIREBASE_CONFIG=/config/config.json
ENV GOOGLE_APPLICATION_CREDENTIALS=/config/credentials.json
CMD ["node", "standalone.js"]
