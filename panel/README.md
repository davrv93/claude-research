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

## Documentos (0.7.0)

Segunda interfaz, `ui://research-academy/docs` (`docs.html`), herramienta `docs_analizar(instruccion, accion)`. El alumno suelta un Excel, CSV, PDF o Word en el panel; el archivo no pasa por Claude.

- Excel/CSV: SheetJS lee hojas, columnas, tipos, vacíos, estadísticas por columna, fórmulas por celda (`cellFormula`) y celdas con error. Las filas con fórmulas (totales) se excluyen de las cifras. Muestra de hasta 300 filas por hoja al modelo.
- PDF: pdf.js, texto por página; avisa si parece escaneado (sin OCR). Word: mammoth, texto y títulos. Textos mayores a 60 000 caracteres se resumen por partes.
- El modelo `:free` entrega 3 a 6 hallazgos con cifras exactas y una línea `TEMA:`. Permiso explícito (recordado) antes de enviar contenido.
- "Enviar a Claude" manda un contexto compacto (~400 tokens): archivo, estructura, hallazgos, acción pedida e instrucción, más la indicación de confirmar y preguntar la acción si falta. Se guarda una nota tipo `documento` en el cerebro.
- "Generar aquí → Generar PPT" (0.8.0): el modelo `:free` devuelve un guion JSON (título, láminas con viñetas y, si aporta, un gráfico que nombra hoja, columna categoría y columna valor). El panel calcula las series con las filas del archivo y construye el `.pptx` con PptxGenJS (portada, láminas con viñetas y gráfico nativo, cierre). El archivo se sube a `POST /archivo` y se descarga por enlace (`GET /archivo/:id/:nombre`), 24 horas, tope 10 MB, solo .pptx/.docx/.xlsx/.csv/.md/.txt/.json. Limpieza horaria. `archivos.mjs`.
- "Añadir a este Word" (0.9.0): solo para `.docx`. El panel busca fuentes en Parallel (opcional), el modelo `:free` redacta la sección (título, párrafos, subtítulos, viñetas) citando [n], y otra llamada arma las referencias en APA 7. JSZip inserta los párrafos en `word/document.xml`, al final o después del título elegido, usando los estilos de título y lista del propio documento (`word/styles.xml`); el resto del archivo no se toca. Resultado por enlace de descarga. "Añadir solo referencias" inserta únicamente la lista APA.
- "Corregir este Excel" (0.10.0): solo `.xlsx`/`.xlsm`. Revisión determinista: rangos de SUM/AVERAGE/COUNT/MAX/MIN de una columna que terminan antes del último dato de esa columna, y celdas con error. Opcional: sugerencias del modelo `:free` sobre las fórmulas existentes, validadas (solo celdas que ya tienen fórmula, sin `=`, sin `<>`). El alumno marca los cambios; JSZip reemplaza `<f>` en el XML de la hoja, quita el valor cacheado y activa `fullCalcOnLoad`, así Excel recalcula al abrir y los formatos se conservan. Descarga por enlace.

## Fases 1 a 3 (0.11.0)

Todo lo del mapa de 18 pedidos está construido. Herramientas MCP: `delegar`, `investigar`, `mapa`, `cerebro_buscar`, `docs_analizar`, `docs_crear`, `citar`, `calcular`, `cerebro_compartir`.

- `docs-extra.js` (servido desde `/docs-extra.js`): funciones puras para crear Excel con fórmulas y Word (`docx`), comparar dos tablas por clave, limpiar datos (espacios, mayúsculas, duplicados, fechas ISO, teléfonos de 9 dígitos, montos), mensajes personalizados con `{Columna}`, series y gráfico PNG en canvas, PDF a Word y Excel a PDF (jsPDF). Probadas en Node (`test_extra.cjs` del piloto).
- Panel Documentos: acciones por tipo de archivo. Tabla: gráfico PNG, comparar, limpiar, mensajes, convertir a PDF, corregir fórmulas, PPT. Texto (PDF/Word): corregir redacción o resumen a Word nuevo, fichas y cuestionario, frases copiadas (Parallel), convertir PDF a Word, añadir sección y referencias (solo .docx). Imagen: foto a Excel (OCR con `nvidia/nemotron-3.5-super-vl:free`) y textos para redes. Audio (mp3, wav, m4a, ogg, webm, hasta 20 MB): transcripción con resumen y acuerdos usando `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`, Word descargable. Crear desde cero sin archivo: `docs_crear`.
- Panel Research: calculadoras (IGV, punto de equilibrio, préstamo francés, margen), citas APA desde URLs (Parallel `web_fetch` + modelo), cerebro compartido de solo lectura por código de 12 caracteres, exportar todo en zip, botón del código.
- Servidor: `GET /cerebro/lectura/:codigo`, `GET /cerebro/:id/codigo`, `GET /cerebro/:id/zip` (cerebro.md, cerebro.json, LEEME.txt), `GET /docs-extra.js`; `PUT /cerebro/:id` registra el código de lectura; archivos admiten `.png` y `.pdf`.
- Skills: `plantillas-carrera` (atajos por carrera que nombran la herramienta) y regla "Versión final con Claude" en `research-academy`.

## Configuración, Código y 3D (0.12.0)

- `proveedores.js` (servido desde `/proveedores.js`): capa única para Gemini (`gemini-2.5-flash`), Mistral (`codestral-latest`), Groq (`llama-3.3-70b-versatile`), Cerebras (`llama-3.3-70b`) y OpenRouter `:free`, todos por endpoint compatible con OpenAI y streaming. Llaves en `localStorage` del origen del panel; orden de preferencia por tarea (código, texto, visión, audio) con respaldo automático ante 401, 403, 429 o 5xx. Los cuatro proveedores aceptan llamadas desde el navegador (CORS verificado). Probado en Node con `fetch` simulado.
- Panel Configuración (`configurar`): autorizar OpenRouter y ver cuota, guardar y probar llaves, orden por tarea, frase del cerebro, permisos, exportar e importar configuración sin llaves. Los otros paneles comparten el mismo origen, así que la configuración se hace una vez.
- Panel Código (`codigo`): escribir, corregir, explicar, revisar, tests, convertir; proveedor automático o elegido; vista previa de HTML, CSS y JS en iframe con `sandbox="allow-scripts"` (sin acceso a las llaves); ejecución de JavaScript en un Web Worker con tope de 5 s; descarga por enlace; "Pasar a Claude para la versión final"; nota en el cerebro.
- Panel 3D (`render3d`): el modelo (visión si hay foto) devuelve un JSON de primitivas (box, sphere, cylinder, cone, torus, capsule, plane) con posición, rotación, escala, color y material; el panel lo normaliza y lo renderiza con three.js 0.170 (import map desde unpkg), OrbitControls, luces y sombras; animación girar o flotar con GSAP; edición de color y alto por pieza; "Pedir mejoras"; descarga PNG y GLB (`GLTFExporter`); nota en el cerebro. El código del modelo nunca se ejecuta: solo datos.
- `comun.css` compartido. `manifest.json` fija `SERVER_URL` para que el origen del panel sea estable también en Claude Desktop.
