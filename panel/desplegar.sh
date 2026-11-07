#!/usr/bin/env bash
# Publica el conector MCP en el EC2 3.151.56.55: https://jmd-learn.online/research-academy/mcp
#   LLAVE=~/Downloads/curdilmer.pem ./desplegar.sh
# Contenedor research-academy (127.0.0.1:18670, 96 MB). Sin secretos: no hay .env.
# nginx: /etc/nginx/snippets/research-academy.conf, incluido en /etc/nginx/sites-enabled/jmd-learn antes de
# tienda-sol.conf (igual que gachapon), con copia previa del sitio y nginx -t antes de recargar.
set -euo pipefail
cd "$(dirname "$0")"
LLAVE=${LLAVE:?LLAVE=ruta de la llave}
H=ubuntu@3.151.56.55
URL=https://jmd-learn.online/research-academy/mcp
node probar-stdio.mjs >/dev/null
ssh -i "$LLAVE" $H 'mkdir -p ~/research-academy/build'
scp -q -i "$LLAVE" Dockerfile .dockerignore package.json package-lock.json mcp.mjs server.mjs cerebro.mjs archivos.mjs panel.html docs.html docs-extra.js nginx.conf $H:research-academy/build/
ssh -i "$LLAVE" $H URL="$URL" bash -s <<'REMOTO'
set -euo pipefail
cd ~/research-academy/build
sudo docker build -q -t research-academy:1 . >/dev/null
sudo docker rm -f research-academy >/dev/null 2>&1 || true
sudo docker run -d --name research-academy --restart unless-stopped --memory 96m --memory-swap 128m \
  -e SERVER_URL="$URL" -e ALLOWED_HOSTS=jmd-learn.online,127.0.0.1,localhost \
  -v research-academy-datos:/app/datos \
  -p 127.0.0.1:18670:18670 research-academy:1 >/dev/null
if ! sudo test -e /etc/nginx/snippets/research-academy.conf; then
  sudo install -m 644 nginx.conf /etc/nginx/snippets/research-academy.conf
  sudo cp -p /etc/nginx/sites-enabled/jmd-learn "/tmp/jmd-learn.antes-research-academy-$(date +%s)"
  sudo python3 - <<'PY'
from pathlib import Path
p = Path('/etc/nginx/sites-enabled/jmd-learn'); assert p.is_file() and not p.is_symlink()
s = p.read_text(); marca = '    include /etc/nginx/snippets/tienda-sol.conf;'
assert marca in s and 'research-academy.conf' not in s
p.write_text(s.replace(marca, '    include /etc/nginx/snippets/research-academy.conf;\n' + marca, 1))
PY
  sudo nginx -t && sudo systemctl reload nginx
else
  sudo install -m 644 nginx.conf /etc/nginx/snippets/research-academy.conf && sudo nginx -t && sudo systemctl reload nginx
fi
for i in $(seq 1 20); do curl -fsS -o /dev/null -X POST -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' http://127.0.0.1:18670/mcp && break; sleep 1; done
sudo docker ps --filter name=research-academy --format '{{.Names}} {{.Status}}'
REMOTO
URL_MCP=$URL node probar-http.mjs
