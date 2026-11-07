# Benchmark local de la Skill research-academy

Fecha: 2026-11-07. Modelo: Claude Sonnet via `claude -p` con `SKILL.md` como system prompt. Sin MCP reales: Claude asume que la herramienta externa respondio. Se mide decision de ruta, formato y tokens de salida de Claude. No se mide cuota de claude.ai.

## 1. Consumo de Claude: A/B con 10 preguntas iguales

| Condicion | Palabras SKILL.md | Tokens salida | Razonamiento | Texto visible | Palabras visibles |
|---|---:|---:|---:|---:|---:|
| Sin Skill | 0 | 5126 | 427 | 4699 | 1446 |
| Skill 0.3.0 | 1265 | 8264 | 3700 | 4564 | 1347 |
| Skill 0.4.0 | 338 | 5461 | 2599 | 2862 | 807 |

Skill 0.4.0 frente a sin Skill: texto visible −39 % en tokens, −44 % en palabras. Entrada por turno: 338 palabras de Skill frente a 1 265 en 0.3.0.

Por caso, texto visible (tokens) sin Skill frente a 0.4.0:

| # | Tipo | Sin Skill | Skill 0.4.0 |
|---:|---|---:|---:|
| 1 | openrouter | 283 | 213 |
| 5 | parallel | 164 | 211 |
| 7 | openrouter | 268 | 267 |
| 12 | openrouter | 462 | 259 |
| 13 | directo | 749 | 407 |
| 19 | directo | 1027 | 340 |
| 22 | openrouter | 447 | 422 |
| 25 | openrouter | 279 | 303 |
| 31 | openrouter | 157 | 164 |
| 44 | directo | 863 | 276 |

Lectura:

- El ahorro grande esta donde Claude escribiria mucho sin la Skill: planes y proyectos (#19, #44) bajan cerca de 70 %.
- En preguntas cortas de concepto el texto visible apenas cambia; ahi la Skill no ahorra.
- El razonamiento sube en los casos con herramienta porque la prueba obliga a imaginar la respuesta externa. En los casos directos (#13, #19, #44) el razonamiento con Skill es igual o menor que sin Skill. En claude.ai el razonamiento extendido puede estar apagado.
- La delegacion a OpenRouter no reduce por si misma el trabajo de Claude: Claude lee el resultado y redacta la sintesis. Lo que ahorra es el tope de 120 palabras y la sintesis en 3 puntos.
- Skill 0.3.0 aumentaba el consumo (+61 % de salida) por sus 1 265 palabras y su pie `Consumo` condicional. Por eso se reescribio.

## 2. Enrutamiento: 50 casos

Criterios: ruta esperada, espanol, maximo 180 palabras antes del pie (Artifacts exentos), pie `Consumo:` presente. **Skill 0.4.0: 48/50.** Promedio de palabras visibles en casos no Artifact: 59 (0.3.0: cerca de 100).

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

Los 2 casos no OK no son fallos de la Skill: #30 (hoja de stock) eligio Artifact en vez de directo, valido; #48 (traducir al ingles) disparo el detector de idioma con una respuesta correcta.

| # | Area | Ruta esperada | Ruta obtenida | Palabras | OK |
|---:|---|---|---|---:|:-:|
| 1 | ciencias | openrouter | openrouter | 107 | si |
| 2 | ciencias | openrouter | openrouter | 54 | si |
| 3 | ciencias | parallel | parallel | 56 | si |
| 4 | ciencias | openrouter | openrouter | 23 | si |
| 5 | tecnologia | parallel | parallel | 54 | si |
| 6 | tecnologia | parallel | parallel | 47 | si |
| 7 | tecnologia | openrouter | openrouter | 89 | si |
| 8 | tecnologia | parallel | parallel | 79 | si |
| 9 | matematicas | openrouter | openrouter | 63 | si |
| 10 | matematicas | directo | directo | 21 | si |
| 11 | matematicas | openrouter | openrouter | 65 | si |
| 12 | gestion | openrouter | openrouter | 71 | si |
| 13 | gestion | directo | directo | 104 | si |
| 14 | gestion | parallel | parallel | 74 | si |
| 15 | gestion | directo | directo | 42 | si |
| 16 | software | artifact | artifact | 43 | si |
| 17 | software | directo | directo | 60 | si |
| 18 | software | parallel | parallel | 96 | si |
| 19 | software | directo | directo | 56 | si |
| 20 | software | openrouter | openrouter | 82 | si |
| 21 | ventas | directo | directo | 35 | si |
| 22 | ventas | openrouter | openrouter | 42 | si |
| 23 | ventas | directo | directo | 24 | si |
| 24 | ventas | parallel | parallel | 48 | si |
| 25 | contabilidad | openrouter | openrouter | 41 | si |
| 26 | contabilidad | directo | directo | 35 | si |
| 27 | contabilidad | parallel | parallel | 100 | si |
| 28 | contabilidad | artifact | artifact | 51 | si |
| 29 | contabilidad | directo | directo | 28 | si |
| 30 | tiendas | directo | artifact | 44 | no |
| 31 | tiendas | openrouter | openrouter | 45 | si |
| 32 | tiendas | parallel | parallel | 58 | si |
| 33 | literatura | openrouter | openrouter | 37 | si |
| 34 | literatura | directo | directo | 104 | si |
| 35 | literatura | directo | directo | 50 | si |
| 36 | analisis | directo | directo | 46 | si |
| 37 | analisis | openrouter | openrouter | 78 | si |
| 38 | analisis | artifact | artifact | 101 | si |
| 39 | arte | openrouter | openrouter | 93 | si |
| 40 | arte | parallel | parallel | 75 | si |
| 41 | arte | directo | directo | 46 | si |
| 42 | educacion | directo | directo | 29 | si |
| 43 | educacion | openrouter | openrouter | 82 | si |
| 44 | proyectos | directo | directo | 69 | si |
| 45 | proyectos | parallel | parallel | 95 | si |
| 46 | proyectos | directo | directo | 77 | si |
| 47 | consumo | directo | directo | 45 | si |
| 48 | simple | directo | directo | 8 | no |
| 49 | simple | directo | directo | 59 | si |
| 50 | privacidad | directo | directo | 15 | si |

## 3. Limites

- Sin Parallel ni OpenRouter reales; los tokens externos del pie son simulados.
- Una corrida por condicion; hay variacion entre corridas.
- Otro modelo en claude.ai (Opus, Haiku) puede enrutar o extenderse distinto.
- Costo total de las corridas: cerca de US$7 en API.
- La medicion que importa al taller es en claude.ai, Configuracion > Uso, con el protocolo de `references/medicion.md`.
