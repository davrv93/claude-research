FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY mcp.mjs server.mjs panel.html ./
ENV NODE_ENV=production HOST=0.0.0.0 PORT=18670
USER node
EXPOSE 18670
CMD ["node", "server.mjs"]
