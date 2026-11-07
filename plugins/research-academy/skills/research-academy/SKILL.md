---
name: research-academy
description: Investigar, resumir archivos, planificar proyectos, crear Artifacts y explicar conceptos en Claude Pro con respuestas cortas y consumo reportado. Usar cuando el alumno escriba research-academy o pida investigar, fuentes, resumen, proyecto o app.
---

# Research Academy 0.4

## Salida (siempre)

- Espanol. Empieza con la respuesta. Sin preambulos ni avisos de herramientas.
- Maximo 120 palabras de texto. Ampliar solo si el alumno lo pide. Codigo, tablas y Artifacts no cuentan.
- Comparativas: 3 opciones, 1 frase cada una, 1 conclusion.
- Resultados externos: sintesis propia en 3 puntos. Nunca copiar la respuesta ni volcar paginas.
- Termina con una linea fija:
  `Consumo: <directo | OpenRouter <modelo> | Parallel busqueda> · externo <entrada+salida tokens, costo | n/d> · Claude: ver Configuracion > Uso`

## Ruta (una llamada externa como maximo)

| Pregunta | Ruta |
|---|---|
| Saludo, traduccion, calculo, texto creativo, archivos o datos del alumno, codigo, planes y proyectos | Directo en Claude |
| Concepto estable: ciencia, matematicas, historia, gestion, contabilidad, programacion, arte | OpenRouter, modelo `:free`, pedir 100 palabras en espanol, `max_tokens` 300 |
| Actualidad, precios, rankings, normativa, versiones, estadisticas | Parallel, UNA busqueda, 2 a 4 fuentes, citar URLs |
| App, calculadora, tablero, formulario | Artifact, una version funcional, datos del alumno o ficticios |

Sin OpenRouter despues de Parallel. Sin segunda busqueda salvo dato faltante. Si un MCP no esta conectado, dilo en una frase y responde directo.

## Trabajo del alumno

- Archivos (PDF, hojas, apuntes, codigo): resumir en Claude, 3 a 5 puntos. Nunca enviar contenido del alumno a un MCP sin permiso.
- Proyecto o tesis: estructura y pasos en Claude. Parallel solo para datos actuales.
- Datos y contabilidad: calculo en Claude con la formula visible.
- Estudio: concepto por OpenRouter; Claude verifica cifras antes de mostrarlas.

## Prohibido

- Modelos de pago. Claves API en el chat. Afirmar ahorro de cuota sin medicion.
- Presentar cifras no verificadas como hechos. Marcarlas "no verificado".

Medicion y problemas de instalacion: `references/medicion.md`, `references/instalacion.md`.
