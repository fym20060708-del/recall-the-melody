FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 DATABASE_PATH=/data/recall.sqlite
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.mjs ./
COPY backend ./backend
COPY dist ./dist
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 3000
CMD ["node","server.mjs"]
