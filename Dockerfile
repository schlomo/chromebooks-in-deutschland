FROM node:14 as builder
ARG VERSION
ADD . /work/
WORKDIR /work
ENV NODE_ENV=production
RUN yarn --frozen-lockfile && \
    yarn prep && \
    grep -v dirty VERSION && \
    chmod -R o+rX .

FROM node:14-alpine
WORKDIR /work
COPY --from=builder /work/functions /work
VOLUME /config
ENV NODE_ENV=production
ENV CID_API_URL http://localhost:5000/api
ENV CID_API_KEY random_key
CMD ["node", "updateprice.js"]
