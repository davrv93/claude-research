# Prompt: construir el panel MCP de delegación para Claude

Copia desde la línea siguiente hasta el final y pégalo como primer mensaje a un agente de código (Claude Code, Cursor, etc.).

---

Construye un servidor MCP con interfaz visual (MCP App) llamado `research-academy-panel`. Objetivo: que Claude delegue preguntas e investigaciones web a un modelo gratuito de OpenRouter y que la respuesta se muestre al usuario en un panel dentro del chat, sin que ese texto entre al contexto de Claude. Claude solo debe recibir una línea de texto por llamada.

## Restricciones

- El servidor no guarda llaves ni llama a ningún modelo. No tiene secretos.
- La llave de OpenRouter se crea con OAuth PKCE desde el panel, en el navegador del usuario, y se guarda en `localStorage`. Nunca pasa por el servidor ni por Claude.
- Solo modelos cuyo id termine en `:free`. Rechazar cualquier otro con `isError: true`.
- Respuestas en español. Sin dependencias de build: HTML plano con un `<script type="module">`.
- Node 18 o superior, ES modules. Paquetes: `@modelcontextprotocol/sdk@^1.30`, `@modelcontextprotocol/ext-apps@^1.7.5`, `zod@^4`.

## Arquitectura

Tres archivos de servidor y uno de interfaz:

- `mcp.mjs`: exporta `buildServer()`. Registra con `registerAppTool` dos herramientas y con `registerAppResource` un recurso `ui://research-academy/panel` cuyo contenido es `panel.html`, MIME `text/html;profile=mcp-app` (`RESOURCE_MIME_TYPE`). En `_meta.ui.csp` declara `connectDomains: ['https://openrouter.ai', 'https://mcp.parallel.ai']` y `resourceDomains: ['https://unpkg.com']`. Si existe la variable `SERVER_URL`, calcula `ui.domain` = primeros 32 hex del SHA-256 de esa URL + `.claudemcpcontent.com`.
- `server.mjs`: transporte Streamable HTTP sin sesiones (`createMcpExpressApp`, `POST /mcp`, `GET` y `DELETE` devuelven 405). Para claude.ai web.
- `stdio.mjs`: mismo `buildServer()` con `StdioServerTransport`. Para Claude Desktop.
- `panel.html`: la interfaz.

Herramientas (ambas con `_meta: { ui: { resourceUri: 'ui://research-academy/panel' } }`):

1. `delegar(pregunta: string, modelo = 'nvidia/nemotron-3-ultra-550b-a55b:free', max_palabras = 150)`. Devuelve `content` con una sola línea: "Panel abierto con <modelo>. El alumno ve la respuesta ahí. Responde solo: 'Listo, revisa el panel.' más el pie Consumo." y `structuredContent: { modo: 'delegar', pregunta, modelo, max_palabras }`.
2. `investigar(pregunta, consultas: string[1..3] de 3 a 6 palabras, modelo, max_palabras)`. Misma forma de respuesta con `modo: 'investigar'`.

La descripción de cada herramienta debe decirle a Claude que no repita ni resuma lo que muestra el panel.

## Interfaz (`panel.html`)

- Importa `App` desde `https://unpkg.com/@modelcontextprotocol/ext-apps@1.7.5/dist/src/app-with-deps.js`. Registra `app.ontoolinput` y `app.ontoolresult` antes de `await app.connect()`.
- Al recibir `structuredContent`: si `modo === 'investigar'`, primero busca; si no, pregunta directo.
- Búsqueda: `POST https://mcp.parallel.ai/mcp` con cabeceras `Content-Type: application/json` y `Accept: application/json, text/event-stream`, cuerpo JSON-RPC `tools/call` con `name: 'web_search'` y `arguments: { objective: pregunta, search_queries: consultas }`. No requiere autenticación y tiene CORS abierto. La respuesta es SSE: toma la línea que empieza con `data: `, parsea el JSON y luego parsea `result.content[0].text`, que es otro JSON con `results[]` de `{ url, title, excerpts[] }`. Toma 5 fuentes y recorta cada extracto a 900 caracteres.
- Inferencia: `POST https://openrouter.ai/api/v1/chat/completions` con `Authorization: Bearer <llave>`, `model`, `max_tokens = max_palabras * 2.5`, `usage: { include: true }`. Con fuentes, el system prompt exige citar solo las fuentes numeradas con `[n]` y declarar si no bastan. Muestra la respuesta, la lista de fuentes con enlace y `usage` (tokens, costo, id).
- Autorización PKCE sin callback: genera `code_verifier`, calcula `code_challenge` S256, abre `https://openrouter.ai/auth?code_challenge=...&code_challenge_method=S256&key_label=Research%20Academy%20Panel` sin `callback_url`. OpenRouter muestra un código en pantalla; el usuario lo pega en el panel; canjéalo con `POST https://openrouter.ai/api/v1/auth/keys` enviando `{ code, code_verifier, code_challenge_method: 'S256' }`. Guarda `key`. Muestra también el enlace en texto por si el iframe bloquea `window.open`.
- Campo de seguimiento para nuevas preguntas al modelo externo sin pasar por Claude. Botones Copiar, Desconectar y "Pasar a Claude" (usa `app.updateModelContext` si existe, avisando que eso sí gasta Claude).
- Medidor con tres barras por consulta y acumulado en `localStorage`: Claude (estimado: caracteres que entran y salen por la herramienta ÷ 3,8 más 45 fijos), externo (medido por OpenRouter), evitado (lo que el modelo externo leyó y escribió). Etiqueta claramente que Claude es estimación.

## Empaquetado para Claude Desktop

`manifest.json` con `manifest_version: "0.3"`, `server: { type: 'node', entry_point: 'stdio.mjs', mcp_config: { command: 'node', args: ['${__dirname}/stdio.mjs'] } }`, `tools`, `privacy_policies`, `compatibility.platforms: ['darwin','win32']`. Añade `.mcpbignore` con `server.log`, `README.md`. Empaqueta con `npx @anthropic-ai/mcpb validate manifest.json` y `npx @anthropic-ai/mcpb pack . ../dist/research-academy-panel-<version>.mcpb`.

## Verificación obligatoria antes de dar por terminado

1. `node --check` en los tres `.mjs` y en el módulo extraído de `panel.html`.
2. Por stdio: envía por stdin `initialize`, `notifications/initialized`, `tools/list` y `resources/read` del recurso `ui://`. Debe listar `delegar` e `investigar` y devolver el HTML con `_meta.ui.csp`.
3. Por HTTP: `tools/list` muestra `_meta.ui.resourceUri`; `tools/call delegar` con un modelo de pago devuelve `isError: true`.
4. Script Node que ejecute la misma lógica de búsqueda contra `mcp.parallel.ai` y muestre 5 fuentes parseadas.
5. `mcpb validate` sin errores y el `.mcpb` generado.

## Datos verificados el 2026-11-07 que puedes dar por ciertos

- `mcp.parallel.ai/mcp` responde `tools/call web_search` sin autenticación, con `access-control-allow-origin: *`. Un resultado pesa unos 50 000 caracteres.
- `openrouter.ai/api/v1/chat/completions` y `/api/v1/auth/keys` responden al preflight CORS con `access-control-allow-origin: *`.
- Las herramientas de OpenRouter MCP oficial no sirven para esto: devuelven el texto a Claude.
- Claude Desktop renderiza MCP Apps de servidores locales por stdio. Claude.ai web las renderiza desde conectores agregados por URL HTTPS.

## Lo que no está verificado y debes probar en Claude Desktop

Que el panel se renderice, que `window.open` funcione desde el iframe, que Parallel no exija aceptar términos en la primera llamada, y cuánto cambia Configuración > Uso con y sin panel.
