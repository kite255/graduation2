FROM node:22-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY sql ./sql

RUN mkdir -p /app/uploads \
    && chown -R node:node /app

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0
ENV UPLOAD_DIR=/app/uploads

USER node

EXPOSE 3001

CMD ["node", "src/server.js"]