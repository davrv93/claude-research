# Research Academy - Marketplace personal para Claude Pro

Repositorio oficial del taller: https://github.com/davrv93/claude-research

Este repositorio distribuye un plugin para Claude Pro que combina una Skill de investigacion eficiente con referencias a dos MCP remotos administrados por sus proveedores. Los participantes no necesitan instalar DeepSeek, Python, Docker ni Node.js.

## Instalacion para alumnos

1. Abre https://claude.ai/customize/plugins (o **Personalizar > Plugins**).
2. Selecciona **Agregar > Agregar marketplace > Desde repositorio**.
3. Pega el identificador `davrv93/claude-research` o la URL completa `https://github.com/davrv93/claude-research`.
4. Instala el plugin **Research Academy** y habilitalo.
5. Verifica los conectores. **Parallel** funciona gratuitamente en modo limitado sin registro. **OpenRouter** requiere que cada participante autorice su propia cuenta mediante OAuth, y los modelos gratuitos estan sujetos a cuotas.

La instalacion del plugin no garantiza la autorizacion automatica de todos los conectores. Si se necesita, agregalos en **Personalizar > Conectores** con las URLs que aparecen abajo.

## Servicios externos incluidos

- **Parallel MCP oficial:** `https://mcp.parallel.ai/mcp`. Tiene `web_search`, `web_fetch` y `web_decisions` gratuitos sin cuenta (con rate limit); `web_research` requiere inicio de sesion y puede facturarse.
- **OpenRouter MCP oficial:** `https://mcp.openrouter.ai/mcp`. Permite consultar el catalogo y enviar solicitudes de prueba a modelos mediante `send-message`. Requiere OAuth. Usar exclusivamente modelos con precio 0 para evitar cargos. La autorizacion OAuth puede crear una clave con un tope de gasto: **un tope no equivale a credito gratis**.

Importante: estos MCP no eliminan el consumo de Claude Pro. Claude sigue realizando las llamadas de herramienta y consumiendo contexto con las respuestas.

## Para el instructor: publicar el contenido

Este repositorio estaba vacio cuando se preparo el paquete. Sube **los archivos extraidos** del ZIP a la raiz del repositorio, no el archivo ZIP solo. Conserva las carpetas ocultas `.claude-plugin`.

Debe quedar asi:

```
claude-research/
  .claude-plugin/marketplace.json
  plugins/research-academy/.claude-plugin/plugin.json
  plugins/research-academy/.mcp.json
  plugins/research-academy/skills/research-academy/SKILL.md
  README.md
  ALUMNOS.md
```

Para subir sin terminal: entra a https://github.com/davrv93/claude-research, usa **Add file > Upload files** o el enlace de subida del repositorio vacio, y arrastra todos los archivos y carpetas extraidos. Confirma los cambios (Commit changes). Si tu explorador oculta carpetas que comienzan con punto, usa un gestor de archivos que muestre archivos ocultos o el metodo Git local.

## Comprobacion antes de impartir

- Comprueba que https://github.com/davrv93/claude-research/blob/main/.claude-plugin/marketplace.json abre un JSON.
- Agrega `davrv93/claude-research` desde una cuenta Claude Pro de prueba.
- Verifica que aparece el plugin Research Academy y que la Skill esta disponible.
- Prueba una consulta pequena con Parallel. Verifica si OpenRouter pide OAuth. No autorices gasto accidental.
- Pide crear un Artifact basado en 3-5 fuentes y revisa el uso de Claude Pro.

## Integracion con el LMS

El LMS puede presentar instrucciones y un boton que lleve a `https://claude.ai/customize/plugins`, ademas de un boton para copiar `davrv93/claude-research`. Claude realiza la instalacion y solicita autorizaciones. No existe una forma publica documentada de instalar silenciosamente en cuentas individuales Claude Pro desde tu LMS.

## Licencia

MIT. Guia sencilla de participante: `ALUMNOS.md`.
