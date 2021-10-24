# force to use Alpine <3.13 to workaround weird Raspberry Pi related bug
# e.g. https://githubmemory.com/repo/SensorsIot/IOTstack/issues/401
FROM node:16-alpine3.12
LABEL org.opencontainers.image.description="Chromebooks-in-Deutschland Agent" \
    org.opencontainers.image.source=https://github.com/schlomo/chromebooks-in-deutschland
WORKDIR /work
COPY functions /work
ENV NODE_ENV=production
ENV CID_API_URL http://localhost:5000/api
ENV CID_API_KEY random_key
CMD ["node", "updateprice.js"]
