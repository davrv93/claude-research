# research-academy-panel

Servidor MCP con interfaz (MCP App). Claude delega una pregunta o una investigación web a un modelo
gratuito de OpenRouter; la respuesta aparece en un panel dentro del chat y **no entra al contexto de
Claude**. Claude recibe una sola línea por llamada.

- El servidor no guarda llaves ni llama a ningún modelo. No tiene secretos.
- La llave de OpenRouter se crea con OAuth PKCE desde el panel y se guarda en `localStorage` del panel.
- Solo modelos `:free`; cualquier otro devuelve `isError: true`.

## Herramientas

| Herramienta | Argumentos | Qué hace el panel |
|---|---|---|
| `delegar` | `pregunta`, `modelo` (`nvidia/nemotron-3-ultra-550b-a55b:free`), `max_palabras` (150) | Pregunta directo al modelo. |
| `investigar` | `pregunta`, `consultas` (1 a 3, de 3 a 6 palabras), `modelo`, `max_palabras` | Busca en Parallel (`web_search`), toma 5 fuentes y pide una respuesta que cite `[n]`. |

## Uso

Claude Desktop: instala `../dist/research-academy-panel-0.4.0.mcpb` (doble clic), o añade a `mcpServers`:

```json
{ "research-academy-panel": { "command": "node", "args": ["/ruta/a/research-academy-panel/stdio.mjs"] } }
```

claude.ai web (conector por URL HTTPS):

```bash
SERVER_URL=https://tu-dominio/mcp HOST=0.0.0.0 ALLOWED_HOSTS=tu-dominio PORT=3000 node server.mjs
```

`SERVER_URL` fija el origen del panel (`<sha256[:32]>.claudemcpcontent.com`), para que la llave
guardada sobreviva entre conversaciones.

## Verificación

```bash
node probar-stdio.mjs                      # initialize, tools/list, resources/read por stdio
PORT=3917 node server.mjs & node probar-http.mjs   # HTTP: resourceUri, modelo de pago rechazado, GET 405
node verificar.mjs                         # búsqueda real en mcp.parallel.ai, 5 fuentes
npx @anthropic-ai/mcpb validate manifest.json
npx @anthropic-ai/mcpb pack . ../dist/research-academy-panel-0.4.0.mcpb
```

## Pendiente de probar en Claude Desktop

Que el panel se renderice, que se abra la autorización (`app.openLink`, luego `window.open`, y el
enlace en texto como respaldo), que Parallel no pida aceptar términos en la primera llamada, y cuánto
cambia Configuración > Uso con y sin panel.

## Despliegue web (jmd-learn.online)

Fuente unica: esta carpeta del repositorio. `~/Documents/research-academy-panel` es un enlace a ella.

```bash
cd ~/Documents/research-academy-panel   # = panel/ del repo clonado en ~/Documents/claude-research
git -C .. pull
LLAVE=~/Downloads/curdilmer.pem ./desplegar.sh
```

`desplegar.sh` prueba por stdio, copia `Dockerfile`, `mcp.mjs`, `server.mjs`, `panel.html` y `nginx.conf` al EC2, reconstruye el contenedor `research-academy` (puerto interno 18670, `SERVER_URL=https://jmd-learn.online/research-academy/mcp`) y verifica por HTTP publico.

## Publicar una version nueva en todos lados

1. Cambiar `VERSION` en `mcp.mjs` y `version` en `package.json` y `manifest.json` (mismo numero).
2. `npx @anthropic-ai/mcpb validate manifest.json && npx @anthropic-ai/mcpb pack . ../dist/research-academy-panel-<version>.mcpb` y borrar el `.mcpb` anterior de `dist/`.
3. `LLAVE=... ./desplegar.sh`.
4. Commit y push. El marketplace apunta a la URL fija; los alumnos de claude.ai web reciben el panel nuevo al instante. Los de Claude Desktop reinstalan el `.mcpb`.

## Cerebro (0.6.0)

Cada respuesta se guarda como nota: pregunta, respuesta, fuentes, fecha, y tema, hallazgos y etiquetas que extrae el modelo `:free` con una llamada extra (0 tokens de Claude). El alumno activa el cerebro con una **frase clave**; el id es su SHA-256 y el servidor guarda `datos/cerebro/<id>.json` (tope 2 MB, 60 peticiones por minuto por IP, volumen Docker `research-academy-datos`). Web y Desktop con la misma frase comparten cerebro; `localStorage` es cache.

- Endpoints: `GET /cerebro/:id`, `PUT /cerebro/:id` (CORS abierto), `GET /salud`.
- Herramientas MCP nuevas: `mapa(tema)` abre el mapa mental en el panel; `cerebro_buscar(frase_clave, tema)` devuelve hasta 5 notas resumidas a Claude, solo cuando el alumno lo pide.
- Exportar `cerebro.md` (para un Proyecto de Claude) o `cerebro.json` (para importar en otro navegador). "Pasar índice a Claude" envía solo temas y hallazgos al chat.
- Variables: `CEREBRO_URL` (base del almacén; por defecto `SERVER_URL` sin `/mcp`), `DATA_DIR`.
- Respaldo en el EC2: `sudo docker run --rm -v research-academy-datos:/d -v ~/respaldos:/b alpine tar czf /b/cerebros-$(date +%F).tgz -C /d .`
