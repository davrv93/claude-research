# Pendientes y oportunidades (actualizado 2026-11-07)

## Camino principal: extension .mcpb para Claude Desktop (sin servidor)

Hecho: `panel/stdio.mjs`, `panel/manifest.json`, paquete en `dist/research-academy-panel-0.4.0.mcpb` (implementacion unificada con la desplegada). Verificado por stdio: initialize, tools/list (delegar, investigar), resources/read con csp. No se pudo instalar aqui: esta maquina no tiene Claude Desktop.

Pendiente, en una maquina con Claude Desktop:
1. Doble clic en el `.mcpb`, instalar, permitir el panel.
2. Probar `delegar` e `investigar`; revisar flujo del codigo de OpenRouter y el aviso de terminos de Parallel.
3. Publicar el `.mcpb` como Release de GitHub (`gh auth login` primero; el token actual es invalido).

## Conector web desplegado (2026-11-07)

URL: `https://jmd-learn.online/research-academy/mcp`. Verificado desde terminal: `tools/list` con `delegar` e `investigar`, recurso `text/html;profile=mcp-app` con csp, `ui.domain` correcto (`62ebd1bc4df726689d7c82243a526f8b.claudemcpcontent.com`), rechazo de modelos de pago, `GET` devuelve 405. Ya esta en `plugins/research-academy/.mcp.json`; la Skill 0.5.0 enruta a `delegar` e `investigar`.

Fuente unica desde 2026-11-07: `panel/` del repo es la misma implementacion que corre en el servidor (version 0.4.0). `~/Documents/research-academy-panel` es un enlace simbolico a `~/Documents/claude-research/panel`. Para publicar en todos lados, seguir "Publicar una version nueva" en `panel/README.md`.

Pendiente: probar en claude.ai web (render, codigo de OpenRouter, terminos de Parallel, Configuracion > Uso).

## Camino de respaldo para claude.ai web (necesita host HTTPS)

1. Desplegar `panel/` en un host Node gratuito con `SERVER_URL=https://HOST/mcp`. Lo hace el instructor una sola vez; los alumnos no instalan nada.
2. Agregar el conector por URL en claude.ai y comprobar que el panel se renderiza (permiso "Permitir").
3. Flujo de autorizacion del alumno: boton "Abrir OpenRouter" debe abrir pestana desde el iframe. Si el marco lo bloquea, el alumno copia el enlace que muestra el panel. OpenRouter muestra un codigo de un solo uso (vence en 10 minutos); el alumno lo pega en el panel y queda conectado para siempre en ese navegador. No es la llave API; la llave nunca toca el servidor.
4. Probar `investigar` real: la primera llamada a Parallel desde el iframe puede pedir aceptar terminos (`x-parallel-terms`); revisar consola del panel.
5. Confirmar que Claude recibe solo la linea de `content` y no todo el `structuredContent` (si lo recibe, son unos 40 tokens).
6. Medir con Configuracion > Uso: misma pregunta con panel, con conector OpenRouter clasico y sin nada.
7. Tras validar: poner la URL en `plugins/research-academy/.mcp.json`, cambiar la fila OpenRouter de `SKILL.md` a `delegar`, subir version 0.5.0.

## Hallazgos que cambian las prioridades

Medido el 2026-11-07 contra los servidores reales:

| Que entra al contexto de Claude | Tamano | Frecuencia |
|---|---:|---|
| Un resultado de `web_search` de Parallel (2 consultas) | 52 000 caracteres, unos 13 000 tokens | cada busqueda |
| Esquemas de las 6 herramientas de Parallel | 36 500 caracteres, unos 9 000 tokens | cada turno, con el conector activo |
| Esquemas de las 17 herramientas de OpenRouter MCP | no medible sin OAuth; estimado similar o mayor | cada turno, con el conector activo |
| Texto que escribe Claude con la Skill 0.4.1 | 100 a 500 tokens | cada turno |

Conclusion: el gasto grande de la configuracion actual no es lo que Claude escribe, es lo que Claude lee: resultados de busqueda y esquemas de herramientas. La Skill 0.4.1 recorta la salida a la mitad; los conectores clasicos la multiplican por la entrada.

## Oportunidades, por impacto

1. **Busqueda web dentro del panel (alto). HECHO en `panel/` 0.2.0, falta prueba en claude.ai.** `investigar(pregunta, consultas)`: el panel llama a `web_search` de Parallel desde el navegador, recorta 5 fuentes a 900 caracteres cada una, el modelo `:free` sintetiza citando [n]. Medido: 54 943 caracteres crudos, 5 094 al modelo externo, 0 a Claude.
2. **Desconectar los conectores clasicos (alto, cero codigo).** Con el panel, Parallel y OpenRouter MCP sobran. Quitarlos ahorra del orden de 9 000 a 20 000 tokens de entrada por turno. Indicarlo en `instalacion.md`.
3. **Artifacts simples generados en el panel (alto).** Para calculadoras y formularios, el modelo `:free` genera el HTML y el panel lo renderiza en un iframe `srcdoc` aislado. Claude no escribe codigo (1 000 a 3 000 tokens por Artifact). Claude queda para Artifacts complejos.
4. **Resumen de archivos en el panel (medio).** El alumno pega el texto en el panel y el modelo `:free` lo resume. El archivo no entra al contexto de Claude. Util para apuntes y textos largos; no aplica a PDF con imagenes.
5. **Chat nuevo por tema (medio, cero codigo).** Cada turno reenvia todo el historial. Regla en la Skill: "tema nuevo, chat nuevo".
6. **Modelo y razonamiento (medio, cero codigo).** Recomendar Sonnet y razonamiento extendido apagado para tareas simples; ambos pesan en la cuota.
7. **Seguimiento dentro del panel (ya hecho).** Preguntas de seguimiento al modelo externo sin tocar Claude.

## Que no se puede arreglar

- Contenido que el alumno sube a Claude (PDF, imagenes) siempre entra al contexto de Claude.
- Lo que Claude escribe lo paga Claude; el panel solo evita que Claude escriba lo que otro modelo puede escribir.
