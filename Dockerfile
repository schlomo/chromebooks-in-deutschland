FROM node:alpine
LABEL org.opencontainers.image.description Chromebooks-in-Deutschland Agent
LABEL org.opencontainers.image.source https://github.com/schlomo/chromebooks-in-deutschland
WORKDIR /work
COPY functions /work
VOLUME /config
ENV NODE_ENV=production
ENV CID_API_URL http://localhost:5000/api
ENV CID_API_KEY random_key
CMD ["node", "updateprice.js"]
