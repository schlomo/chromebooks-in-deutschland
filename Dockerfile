FROM node as builder
# need Bash for build, hence we don't use Alpine
ARG VERSION
ADD . /work/
WORKDIR /work
ENV NODE_ENV=production
RUN find .
RUN cat .dockerignore
RUN yarn --frozen-lockfile
RUN yarn prep
RUN grep -v dirty VERSION
RUN chmod -R o+rX .

FROM node:alpine
WORKDIR /work
COPY --from=builder /work/functions /work
VOLUME /config
ENV NODE_ENV=production
ENV CID_API_URL http://localhost:5000/api
ENV CID_API_KEY random_key
CMD ["node", "updateprice.js"]
