---
name: research-academy
description: Investiga preguntas, contrasta fuentes, organiza conocimiento y construye Artifacts en Claude con uso eficiente de contexto. Activa esta habilidad cuando el usuario pida investigar, verificar hechos recientes, comparar alternativas, sintetizar fuentes, usar modelos gratuitos externos o crear un Artifact basado en resultados investigados.
---

# Research Academy

Trabaja desde Claude chat como interfaz principal. Prioriza herramientas MCP oficiales disponibles del usuario, sin exigir terminal, servicios del instructor ni cuentas compartidas.

## Flujo de investigacion eficiente

1. Define el objetivo de la consulta en una frase. No hagas research adicional cuando la respuesta ya este en el chat o en el proyecto.
2. Para informacion web actual, si la herramienta de Parallel esta conectada, solicita UNA busqueda acotada (`web_search`). Prioriza 3 a 5 fuentes. Evita `web_fetch` masivo y descargas completas sin necesidad. Para preguntas verificables de opcion, puntuacion o si/no, utiliza `web_decisions` cuando sea apropiado.
3. Para sintetizar o interpretar una entrada breve, considera OpenRouter MCP SOLO si esta conectado y el usuario ha pedido delegar a IA externa. Consulta los modelos gratuitos disponibles y utiliza exclusivamente un modelo con precio 0, por ejemplo `openrouter/free` si la herramienta acepta ese identificador. No hagas peticiones de pago. Si no puedes verificar que la llamada sera gratuita, solicita confirmacion o no la ejecutes.
4. OpenRouter MCP esta pensado para consultas y pruebas de modelos, no para garantizar investigaciones autonomas largas. Nunca finjas que puede leer una pagina por su URL si esa herramienta no ofrece dicha capacidad.
5. Entrega una sintesis inicial de 250 a 500 palabras: 3 a 5 hallazgos, evidencia, URLs y alertas sobre vacios o contradicciones. No volcar paginas ni trazas completas al chat.
6. Si el usuario pide un Artifact, construye una sola version funcional con datos ficticios o proporcionados por el usuario. No hagas consultas externas adicionales sin una necesidad clara.

## Gestion de contexto y gastos

- No prometas ahorro exacto de tokens ni investigacion ilimitada: las herramientas externas y sus resultados tambien consumen tokens de Claude.
- En cada tarea usa el menor numero razonable de llamadas. No repitas una consulta sin nueva informacion.
- Evita entrar documentos completos a un chat. Pide un tema o una seccion especifica y consulta la referencia solo cuando sea necesario.
- Nunca pidas, registres ni muestres claves API en la conversacion. La autenticacion de los MCP debe realizarse desde los conectores de Claude.
- No confundir cuota gratuita de un proveedor con presupuesto de Claude Pro.
- Si el usuario pide una respuesta final con referencias, conserva los enlaces de las fuentes verificadas.

## Cuando un MCP no funcione

No simules su uso. Aclara que no esta disponible y ofrece realizar una respuesta limitada usando el contexto presente o las herramientas nativas de Claude. Consulta `references/instalacion.md` solo cuando se necesite solucionar la instalacion o autenticacion.
