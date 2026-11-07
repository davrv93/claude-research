# Benchmark local de la Skill research-academy

Fecha: 2026-11-07. Corridas con `claude -p --setting-sources ""` (sin hooks ni plugins del equipo) y `SKILL.md` como system prompt. Sin MCP reales: Claude asume que la herramienta externa respondio. Se mide decision de ruta, formato y tokens de salida de Claude. No se mide cuota de claude.ai.

## 1. Consumo de Claude: A/B, 10 preguntas iguales, Sonnet

| Condicion | Tokens salida | Razonamiento | Texto visible | Palabras |
|---|---:|---:|---:|---:|
| Sin Skill | 7497 | 226 | 7271 | 2499 |
| Skill 0.4.1 | 3977 | 405 | 3572 | 1179 |

**Skill 0.4.1 frente a sin Skill: −47 % tokens de salida, −53 % palabras.** El razonamiento apenas cambia. Entrada por turno: 361 palabras de Skill.

| # | Tipo | Sin Skill (tokens) | Skill 0.4.1 (tokens) |
|---:|---|---:|---:|
| 1 | openrouter | 259 | 324 |
| 5 | parallel | 389 | 325 |
| 7 | openrouter | 563 | 572 |
| 12 | openrouter | 824 | 358 |
| 13 | directo | 1014 | 435 |
| 19 | directo | 1077 | 444 |
| 22 | openrouter | 788 | 458 |
| 25 | openrouter | 641 | 308 |
| 31 | openrouter | 660 | 235 |
| 44 | directo | 1282 | 518 |

Lectura:

- Ahorro mayor donde Claude escribiria mucho: planes, proyectos, comparativas (#12, #13, #19, #44) bajan 55 a 60 %.
- Pregunta corta de concepto (#1, #7): sin ahorro. OpenRouter no quita trabajo a Claude; Claude lee el resultado y redacta igual. Lo que ahorra es el tope de 120 palabras y la sintesis en 3 puntos.
- La version 0.3.0 (1 265 palabras, pie condicional) aumentaba la salida; por eso se reescribio a 0.4.

## 2. Enrutamiento: 50 casos

Criterios: ruta esperada, espanol, maximo 180 palabras antes del pie (Artifacts exentos), pie `Consumo:` presente.

| Modelo | Skill | OK 4 criterios | Ruta correcta | Pie presente | Palabras promedio |
|---|---|---:|---:|---:|---:|
| Sonnet | 0.4.0 | 48/50 | 49/50 | 50/50 | 59 (*) |
| Sonnet | 0.5.0 (panel) | 46/50 | 47/50 | 50/50 | 33 |
| Haiku | 0.4.1 | 38/50 | 48/50 (**) | 45/50 | 82 |

(*) La corrida de Sonnet se hizo antes de desactivar un plugin de estilo del equipo que acorta respuestas; la ruta no se ve afectada, el promedio de palabras si puede estar deflactado.
Skill 0.5.0 enruta a las herramientas del panel (`delegar`, `investigar`) en lugar de los conectores clasicos; los 4 casos no OK son #30 y #48 (aceptados), #38 (pidio los datos antes de crear el Artifact) y #43 (explico fotosintesis para ninos directo en vez de delegar). El promedio de palabras baja a 33 porque tras delegar Claude solo escribe una frase.

(**) Haiku devolvio texto plano en vez de JSON en 7 casos; se clasifico la ruta leyendo la respuesta. Todas correctas.

Haiku, fallos reales: omite el pie `Consumo` en 5 de 50 respuestas; en 1 caso (#3) afirmo que Parallel no estaba conectado y respondio de memoria. Sonnet no omite el pie. Para el taller, recomendar Sonnet.

Casos no OK aceptados en ambos modelos: #30 (hoja de stock) eligio Artifact en vez de directo; #48 (traducir al ingles) disparo el detector de idioma con respuesta correcta.

| Area | Sonnet 0.4.0 | Haiku 0.4.1 |
|---|---:|---:|
| analisis | 3/3 | 3/3 |
| arte | 3/3 | 1/3 |
| ciencias | 4/4 | 3/4 |
| consumo | 1/1 | 1/1 |
| contabilidad | 5/5 | 2/5 |
| educacion | 2/2 | 2/2 |
| gestion | 4/4 | 4/4 |
| literatura | 3/3 | 3/3 |
| matematicas | 3/3 | 3/3 |
| privacidad | 1/1 | 1/1 |
| proyectos | 3/3 | 3/3 |
| simple | 1/2 | 1/2 |
| software | 5/5 | 4/5 |
| tecnologia | 4/4 | 3/4 |
| tiendas | 2/3 | 2/3 |
| ventas | 4/4 | 2/4 |

## 3. Herramientas reales del conector Parallel (consultado 2026-11-07)

`web_search` (extractos listos para responder sin fetch; varias `search_queries` por llamada), `web_fetch` (solo si los extractos no bastan; modo extracto por defecto), `web_decisions` (probabilidad, eleccion entre opciones o puntaje con citas), `find_verticals` y `search_vertical` (PubMed, ensayos clinicos, bioRxiv, lugares), `send_feedback`.

No existe una herramienta de informe sintetizado: Parallel entrega evidencia, Claude redacta. La Skill 0.4.1 pide una sola llamada `web_search` con 2 a 4 consultas de 3 a 6 palabras y sin `web_fetch` salvo cita exacta. OpenRouter requiere OAuth; sus herramientas no se pudieron listar desde terminal.

## 4. Limites

- Sin Parallel ni OpenRouter reales; los tokens externos del pie son simulados.
- Una corrida por condicion; hay variacion entre corridas.
- Costo total de todas las corridas: cerca de US$10 en API.
- La medicion que importa al taller es en claude.ai, Configuracion > Uso, con el protocolo de `references/medicion.md`.
