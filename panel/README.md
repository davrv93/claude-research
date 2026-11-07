# Research Academy Panel (MCP App)

Delegacion real: la respuesta del modelo gratuito se muestra al alumno en un panel dentro del chat de Claude y **no entra al contexto de Claude**. Claude solo emite la llamada a la herramienta y una frase.

## Herramientas

- `delegar(pregunta)`: pregunta directa al modelo `:free`.
- `investigar(pregunta, consultas)`: el panel busca en la web con Parallel (`mcp.parallel.ai`, sin cuenta, CORS abierto) y el modelo `:free` redacta la sintesis citando [n] solo las fuentes numeradas. Claude no lee el resultado de busqueda (unos 50 000 caracteres por busqueda).

## Como funciona

1. Claude llama a la herramienta `delegar(pregunta, modelo, max_palabras)` o `investigar(pregunta, consultas)`.
2. El servidor NO llama a ningun modelo. Devuelve una linea de texto para Claude y `structuredContent` con la pregunta para el panel.
3. claude.ai renderiza `panel.html` en un marco aislado (MCP App). El panel llama a `https://openrouter.ai/api/v1/chat/completions` desde el navegador del alumno con un modelo `:free`, muestra la respuesta, tokens y costo.
4. La llave de OpenRouter se crea con OAuth PKCE desde el panel y se guarda en `localStorage` del origen del panel. Nunca pasa por Claude ni por este servidor.
5. Botones: preguntas de seguimiento sin gastar Claude, copiar, y "Pasar a Claude" (opcional, si gasta tokens de Claude).

Tokens de Claude por pregunta delegada: la llamada a la herramienta (la pregunta) + una linea de resultado + una frase de respuesta. Cerca de 60 a 120 tokens de salida en lugar de 300 a 600.

## Instalar en Claude Desktop sin servidor (recomendado para el taller)

1. Descargar `dist/research-academy-panel-<version>.mcpb` del repositorio (o del Release).
2. Doble clic en el archivo, o Claude Desktop > Configuracion > Extensiones > Instalar extension. Claude Desktop trae su propio Node; no hay que instalar nada mas.
3. En un chat, pedir: `research-academy investiga: cual es el sueldo minimo vigente en Peru`. Permitir el panel.
4. Primera vez: el panel pide autorizar OpenRouter y pegar el codigo que OpenRouter muestra. Una sola vez por equipo.

El servidor corre en la maquina del alumno por stdio (`stdio.mjs`). Nadie depende de un host del instructor. Solo app de escritorio Mac/Windows; para claude.ai web, ver "Desplegar".

Reempaquetar tras cambios:

```bash
cd panel && npm install --omit=dev && npx @anthropic-ai/mcpb validate manifest.json && npx @anthropic-ai/mcpb pack . ../dist/research-academy-panel-$(node -p "require('./manifest.json').version").mcpb
```

## Ejecutar local (modo HTTP)

```bash
cd panel
npm install
SERVER_URL=https://TU-HOST/mcp npm start
```

`SERVER_URL` debe ser la URL publica final: define `ui.domain` (hash SHA-256 del URL + `.claudemcpcontent.com`), que Claude valida.

## Desplegar

Cualquier host Node con HTTPS: Render, Railway, Fly.io, un VPS. Variables: `SERVER_URL`, `PORT` (el host la suele dar). Para probar rapido desde tu maquina: tunel (`cloudflared tunnel --url http://localhost:3000` o `ngrok http 3000`) y usa esa URL como `SERVER_URL`.

El servidor no guarda llaves ni llama a modelos; no tiene secretos. Aun asi, para produccion conviene autenticar el conector (ver docs de Claude, Authentication for connectors).

## Conectar en claude.ai

1. Personalizar > Conectores > Agregar conector personalizado > URL `https://TU-HOST/mcp`.
2. En un chat, activar el conector y pedir: `research-academy delega: explica los agujeros negros en 100 palabras`.
3. Claude pide permiso para mostrar la app: Permitir.
4. Primera vez: el panel muestra "Abrir OpenRouter", autorizar, pegar el codigo. Una sola vez por navegador.

Para distribuir con el marketplace, agregar a `plugins/research-academy/.mcp.json`:

```json
"research-academy-panel": { "type": "http", "url": "https://TU-HOST/mcp" }
```

y en `SKILL.md` cambiar la fila OpenRouter por: `delegar` del panel.

## Verificar sin claude.ai

```bash
curl -s -X POST http://localhost:3000/mcp -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

Debe mostrar `delegar` con `_meta.ui.resourceUri = ui://research-academy/panel`.

## Prueba local del pipeline de busqueda

`node ../scratch/test_buscar.mjs` no esta en el repo; la misma logica vive en `panel.html` (`buscar`). Verificado el 2026-11-07: 5 fuentes, 54 943 caracteres crudos, 5 094 caracteres al modelo externo, 0 a Claude.

## Pendiente de confirmar en claude.ai

- Que el marco permita `window.open` para OpenRouter; si no, el alumno copia el enlace mostrado.
- Que Claude reciba solo la linea de texto y no el `structuredContent` completo (es pequeno de todos modos).
- Medir con Configuracion > Uso: misma pregunta con y sin panel.
