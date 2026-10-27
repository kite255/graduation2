FROM node:22-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

ENV NODE_ENV=production
ENV PORT=3001
ENV UPLOAD_DIR=/app/uploads

RUN mkdir -p /app/uploads \
    && chown -R node:node /app

USER node

EXPOSE 3001

CMD ["node", "src/server.js"]