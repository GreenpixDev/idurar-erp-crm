FROM node:20-alpine AS base
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY ./ ./

ENV NODE_ENV=production \
    PORT=8888 \
    OPENSSL_CONF=/dev/null

EXPOSE 8888
CMD ["npm", "start"]
