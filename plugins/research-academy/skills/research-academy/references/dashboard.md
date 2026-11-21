# Tableros de datos (dashboard): reglas de diseño

Las usa el panel `dashboard` (`tablero.html`) desde la 0.14.0 y sirven igual en modo directo, cuando el agente escribe el tablero él mismo. Salen de la guía de visualización de datos de Anthropic (forma antes que color, paleta validada para daltonismo, marcas finas, tabla gemela) y del piso de oficio de impeccable (contraste, estados, foco, nada de plantilla genérica).

## Antes de dibujar

1. **La decisión manda.** Pregunta qué decisión debe ayudar a tomar. Cada gráfico responde una pregunta de esa decisión; si no responde ninguna, sobra.
2. **Perfila las columnas:** tipo (fecha, número, categoría, texto o id), valores distintos, rango. Al modelo externo solo van ese perfil y unas 10 filas de muestra, nunca el archivo entero.
3. **El modelo propone un plan en JSON** (cifras, gráficos y filtros); el código calcula y dibuja. El código del modelo nunca se ejecuta.

## Qué forma según el trabajo del dato

| El dato tiene que... | Forma |
|---|---|
| Ser un número que manda | Cifra (stat tile): etiqueta, valor, variación contra el mes anterior y tendencia de 12 puntos |
| Mostrar una tendencia en el tiempo | Línea (área si es una sola serie) |
| Comparar cantidades | Barras horizontales ordenadas de mayor a menor, un solo color |
| Mostrar una parte de un todo, con 6 partes o menos | Barra segmentada |
| Cruzar dos categorías | Mapa de calor con una sola tinta, de claro a oscuro |
| Relacionar dos números | Dispersión, con 3 series como máximo |
| Mostrar el detalle | Tabla con números alineados |
| Contar una categoría contra el resto | Énfasis: esa en color y el resto en gris |

**Prohibido:**
- torta, dona, 3D, dos ejes Y;
- un gráfico de una sola barra, porque eso es una cifra;
- más de 4 cifras arriba o más de 6 gráficos;
- más de 6 series por gráfico; el resto se junta en «Otros».

## Color

- **Paleta categórica fija**, en este orden. Pasa las pruebas de daltonismo en las dos variantes:
  - claro: `#2a78d6 #eb6834 #1baf7a #eda100 #e87ba4 #008300 #6250d6 #e34948`;
  - oscuro: `#3987e5 #d95926 #199e70 #c98500 #d55181 #0ca30c #9085e9 #e66767`.
- **El color sigue a la entidad, no al puesto.** Lima Centro es azul en todos los gráficos y sigue azul aunque un filtro quite a otras sedes.
- **Magnitud:** un solo tono de claro a oscuro. En modo oscuro se invierte: lo pequeño se funde con el fondo.
- **Variación (sube o baja):** verde si es bueno y rojo si es malo, según si «bueno» es subir o bajar. Siempre lleva flecha y texto, nunca solo color. Un porcentaje cambia en puntos (pp), no en % de sí mismo.
- **El texto nunca lleva el color de la serie.** Usa tinta principal, secundaria o apagada, con una muestra de color al lado.
- **Modo oscuro:** tonos propios del oscuro, no una inversión automática. Toma el tema del host (`data-theme`) o, si no hay, `prefers-color-scheme`.

## Marcas y textos

- **Barras:**
  - 24 px de grosor como máximo;
  - borde redondeado de 4 px solo en el extremo del dato;
  - 2 px de separación del color del fondo entre segmentos apilados.
- **Líneas:** de 2 px, sin un punto en cada dato. El nombre de la serie va al final de la línea cuando son 4 o menos.
- **Rejilla:** finita, sólida (nunca punteada) y un tono más oscuro que el fondo.
- **Etiquetas:**
  - el valor en la punta de cada barra, si son 15 o menos;
  - nunca un número en cada punto de una línea;
  - si la barra lleva su valor, el eje de valores sobra.
- **Ejes:** un solo estilo por eje. Todo compacto (`0 / 5 k / 10 k`) si llega a 10 000; completo si no.
- **Formato peruano:** `S/ 5.5 M`, `121.5 k`, `36 %`, fechas como `ene 26`.
- **Letra:** la del sistema (`system-ui`) en todo, incluida la cifra grande. Cifras de tamaño proporcional en las cifras sueltas y `tabular-nums` solo en tablas y ejes.
- **Títulos:** en minúscula de frase. Debajo, la pregunta que responde el gráfico. Sin etiquetas en mayúsculas encima del título.

## Interacción y accesibilidad

- **Una fila de filtros arriba de todo:** primero el periodo (todo, 30 días, 90 días, último año, último mes completo) y luego las categorías. Todos los gráficos y cifras usan el mismo recorte.
- **Tooltip:**
  - el valor en negrita primero y el nombre después;
  - una línea corta del color de la serie como clave;
  - en barras se activa con la barra; en líneas, con una guía vertical.
- **Cada gráfico tiene «Ver tabla».** Ningún valor depende solo del tooltip ni solo del color.
- **Estados:**
  - sin datos para el filtro: un mensaje que dice qué cambiar;
  - filtro por la misma columna del gráfico: un aviso en vez de una sola barra.
- **Teclado y movimiento:** foco visible, `prefers-reduced-motion` y una animación corta al dibujar.
- **Nombres que vienen de los datos:** van con `textContent` o escapados, nunca con `innerHTML` sin escapar.

## Revisor de diseño

Antes de dibujar, el panel corrige el plan y le cuenta al alumno qué cambió y por qué, en «Ajustes de diseño aplicados». Por ejemplo:
- torta → barras ordenadas;
- línea sobre algo que no es fecha → barras;
- columna inexistente → se quita;
- demasiadas series → «Otros».

En modo directo, aplica la misma revisión antes de entregar.

## Entregable

Un solo `.html` que abre con doble clic:
- ECharts 5.6.0 desde cdnjs;
- los datos dentro del archivo;
- la tabla de cada gráfico;
- claro y oscuro;
- sin scroll horizontal en un celular de 390 px.
