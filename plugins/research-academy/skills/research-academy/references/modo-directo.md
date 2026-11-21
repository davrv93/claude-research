# Modo directo (sin panel)

Para Claude Code, Codex, Antigravity, DeepSeek Harness o cualquier cliente que no dibuje el panel. El trabajo lo hace el agente con sus propias herramientas: busqueda web, lectura y escritura de archivos y terminal. La salida no cambia: espanol, maximo 120 palabras de texto, fuentes con enlace y el pie `Consumo`.

## Pie en modo directo

`Consumo: directo · <web | archivo | terminal | ninguna> · agente: ver su medidor`

## Herramienta del panel -> que hacer aqui

| Panel | Modo directo |
|---|---|
| `investigar` | Busqueda web del agente: 2 o 3 consultas de 3 a 6 palabras, 3 a 5 fuentes, cada cifra con su enlace y su fecha. Sin busqueda web: dilo en una linea y marca las cifras "no verificado". |
| `delegar` | Responde tu, maximo 150 palabras, con un ejemplo concreto. |
| `docs_analizar` | Pide la ruta del archivo dentro del proyecto abierto; no pidas que lo pegue entero. Si hay terminal, leelo con un script (Python: `openpyxl`, `pandas`, `pypdf`, `python-docx`; o Node). Sin terminal, pide que lo exporte a CSV o texto. Acciones: `corregir` = lista de celdas con error y formula correcta; `comparar`, `limpiar`, `graficar` = script que deja el resultado en un archivo nuevo, sin tocar el original. |
| `docs_crear` | Crea el archivo en el proyecto: Excel con formulas reales (`openpyxl`), Word con titulos (`python-docx`). Sin terminal: CSV o Markdown listos para abrir. Di la ruta del archivo creado. |
| `codigo` | Hazlo tu. Si hay terminal, ejecuta el codigo o los tests antes de entregar y di si pasaron. |
| `render3d` | Un solo `escena-3d.html` con three.js desde un CDN con version fija, que se abra con doble clic. Sigue `render-3d.md`: luz de entorno, tone mapping, tres luces, GTAO, SMAA, bloom selectivo, formas de torno, extrusion, tubo y organicas fundidas (marching cubes), materiales fisicos (esmalte, encia, piel, vidrio). |
| `dashboard` | Un solo `tablero.html` con ECharts 5.6.0 desde cdnjs y los datos dentro, siguiendo `dashboard.md`: forma segun el trabajo del dato, paleta validada, sin torta ni dos ejes, filtros arriba, tabla por grafico, claro y oscuro. Lee el archivo con un script; al modelo solo el perfil de columnas. |
| `calcular` | Formula visible y resultado. IGV de Peru 18 %. Prestamo: cuota francesa con la TEA convertida a tasa mensual. |
| `citar` | Abre cada URL, toma autor, fecha y titulo y escribe la referencia APA 7. Si falta un dato, "s. f." o "sin autor"; no lo inventes. |
| `mapa`, cerebro | El cerebro vive en el panel. Aqui: mapa mental en un bloque `mermaid` (`mindmap`) y, si el alumno quiere guardarlo, notas en `cerebro/notas.md` del proyecto. |
| `cerebro_buscar`, `cerebro_compartir` | Funcionan sin panel (devuelven texto) si el conector esta instalado; si no, di que esos hallazgos estan en el panel de Claude o Cursor. |
| `configurar` | Las llaves van en la configuracion del propio agente o en un `.env` que no se sube a git. Nunca en el chat. |
| Artifact (Claude) | Un solo archivo `.html` en el proyecto, con datos del alumno o ficticios. |

## Reglas que no cambian

- Contenido del alumno: no lo envies a servicios externos sin permiso.
- Nada de modelos ni servicios de pago sin que el alumno lo pida.
- Cifras de actualidad sin fuente: "no verificado".
