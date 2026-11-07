FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY mcp.mjs server.mjs cerebro.mjs archivos.mjs panel.html docs.html docs-extra.js proveedores.js comun.css config.html codigo.html tres.html ./
RUN mkdir -p /app/datos && chown node:node /app/datos
ENV NODE_ENV=production HOST=0.0.0.0 PORT=18670 DATA_DIR=/app/datos
VOLUME /app/datos
USER node
EXPOSE 18670
CMD ["node", "server.mjs"]
