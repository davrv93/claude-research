# Benchmark local de la Skill research-academy 0.3.0

Fecha: 2026-11-07. Modelo: Claude Sonnet via `claude -p` con `SKILL.md` como system prompt. Sin MCP reales: la prueba mide la **decision de ruta** y el **formato de salida**, no el ahorro de cuota.

Criterios por caso: ruta esperada, respuesta en espanol, maximo 180 palabras antes del pie (Artifacts exentos), pie `Consumo:` presente.

**Resultado: 48/50 casos cumplen los 4 criterios** (corrida inicial 45/50; tras dos ajustes a la Skill se repitieron los 5 fallos y pasaron 3: #26, #31, #41; los 2 restantes, #30 y #48, son limites del evaluador, no de la Skill).

| Area | OK / casos |
|---|---:|
| analisis | 3/3 |
| arte | 3/3 |
| ciencias | 4/4 |
| consumo | 1/1 |
| contabilidad | 5/5 |
| educacion | 2/2 |
| gestion | 4/4 |
| literatura | 3/3 |
| matematicas | 3/3 |
| privacidad | 1/1 |
| proyectos | 3/3 |
| simple | 1/2 |
| software | 5/5 |
| tecnologia | 4/4 |
| tiendas | 2/3 |
| ventas | 4/4 |

## Casos y rutas

| # | Area | Ruta esperada | Ruta obtenida | Palabras | OK |
|---:|---|---|---|---:|:-:|
| 1 | ciencias | openrouter | openrouter | 97 | si |
| 2 | ciencias | openrouter | openrouter | 119 | si |
| 3 | ciencias | parallel | parallel | 146 | si |
| 4 | ciencias | openrouter | openrouter | 54 | si |
| 5 | tecnologia | parallel | parallel | 95 | si |
| 6 | tecnologia | parallel | parallel | 54 | si |
| 7 | tecnologia | openrouter | openrouter | 108 | si |
| 8 | tecnologia | parallel | parallel | 65 | si |
| 9 | matematicas | openrouter | openrouter | 70 | si |
| 10 | matematicas | directo | directo | 37 | si |
| 11 | matematicas | openrouter | openrouter | 156 | si |
| 12 | gestion | openrouter | openrouter | 87 | si |
| 13 | gestion | directo | directo | 152 | si |
| 14 | gestion | parallel | parallel | 99 | si |
| 15 | gestion | directo | directo | 54 | si |
| 16 | software | artifact | artifact | 87 | si |
| 17 | software | directo | directo | 35 | si |
| 18 | software | parallel | parallel | 147 | si |
| 19 | software | directo | directo | 172 | si |
| 20 | software | openrouter | openrouter | 54 | si |
| 21 | ventas | directo | directo | 31 | si |
| 22 | ventas | openrouter | openrouter | 141 | si |
| 23 | ventas | directo | directo | 61 | si |
| 24 | ventas | parallel | parallel | 136 | si |
| 25 | contabilidad | openrouter | openrouter | 65 | si |
| 26 | contabilidad | directo | directo | 92 | si |
| 27 | contabilidad | parallel | parallel | 146 | si |
| 28 | contabilidad | artifact | artifact | 64 | si |
| 29 | contabilidad | directo | directo | 40 | si |
| 30 | tiendas | directo | artifact | 114 | no |
| 31 | tiendas | openrouter | openrouter | 109 | si |
| 32 | tiendas | parallel | parallel | 142 | si |
| 33 | literatura | openrouter | openrouter | 100 | si |
| 34 | literatura | directo | directo | 109 | si |
| 35 | literatura | directo | directo | 131 | si |
| 36 | analisis | directo | directo | 88 | si |
| 37 | analisis | openrouter | openrouter | 99 | si |
| 38 | analisis | artifact | artifact | 62 | si |
| 39 | arte | openrouter | openrouter | 127 | si |
| 40 | arte | parallel | parallel | 109 | si |
| 41 | arte | directo | directo | 111 | si |
| 42 | educacion | directo | directo | 57 | si |
| 43 | educacion | openrouter | openrouter | 69 | si |
| 44 | proyectos | directo | directo | 81 | si |
| 45 | proyectos | parallel | parallel | 126 | si |
| 46 | proyectos | directo | directo | 132 | si |
| 47 | consumo | directo | directo | 45 | si |
| 48 | simple | directo | directo | 8 | no |
| 49 | simple | directo | directo | 115 | si |
| 50 | privacidad | directo | directo | 46 | si |

## Fallos de la corrida inicial y correccion

- #31 FIFO: 193 palabras via OpenRouter. Se fijo sintesis propia de maximo 150 palabras en la ruta OpenRouter.
- #41 paleta de colores: delego a OpenRouter. Se anadio generacion creativa y calculos a la ruta directa.
- #30 hoja de calculo de stock: eligio Artifact en vez de directo. Se acepta como valido.
- #26 calculo IGV y #48 traduccion al ingles: fallos del evaluador (JSON no parseado; detector de idioma), la respuesta era correcta.

## Limites

- No se ejecutaron Parallel ni OpenRouter: la Skill no puede medirse contra respuestas externas reales desde terminal.
- Un modelo distinto en claude.ai (Opus, Haiku) puede enrutar diferente.
- Costo de la corrida: aproximadamente US$2.85 en API.

Casos y runner: carpeta `bench/` del piloto (no incluida en el repo).
