# Prompt: lección del LMS sobre la medición de tokens

Pegar en el generador de contenido del LMS o en un chat de Claude. Público final: alumnos de Claude Pro sin perfil técnico. Reemplazar los datos cuando exista la medición del PDF.

---

Eres el redactor de contenidos de JMD Learning. Escribe una lección corta para el LMS del taller "IA para todos", en español de Perú, tono claro y directo, sin tecnicismos sin explicar. Público: dueños de bodegas, vendedores, contadores, docentes y tesistas que usan Claude Pro.

OBJETIVO DE LA LECCIÓN
Que el alumno entienda qué consume la cuota de Claude y cómo el kit Research Academy reduce lo caro: lo que Claude escribe y los archivos que lee.

DATOS MEDIDOS (úsalos tal cual, no inventes cifras)
Experimento: misma tarea en dos chats nuevos, modelo Sonnet, 7 de noviembre de 2026. Tarea: "escribe en JavaScript una función que valide un DNI peruano de 8 dígitos". Cinco mensajes en cada chat. Medición con el comando "dime cuántos tokens usamos en esta sesión" de claude.ai.

Sin panel: 16 tokens de entrada nueva; 14 315 escritos en caché; 531 968 leídos de caché; 3 462 de salida. Reparto: instrucciones de Claude 79 %, conversación 19 %.
Con panel: 14 tokens de entrada nueva; 15 992 escritos en caché; 536 685 leídos de caché; 1 386 de salida. Reparto: instrucciones de Claude 90 %, conversación 6 %, conector del panel 1,4 %.
Resultado: la salida de Claude bajó 60 % (3 462 a 1 386). La base por mensaje fue igual en ambos, unos 107 000 tokens leídos de caché, que es texto fijo de claude.ai (reglas y lista de herramientas), no del kit. En costo ponderado (lecturas de caché ≈ 10 % del precio, salida ≈ 5 veces) el ahorro total fue de 10 a 20 %.
Advertencias que debes incluir: el reparto por grupos es una estimación; en tareas chicas el ahorro está solo en la salida; con archivos (PDF, Excel) la diferencia es mayor porque el archivo no entra a Claude, pero esa medición aún no está hecha y no debes inventarla.

CONCEPTOS QUE DEBES EXPLICAR EN UNA FRASE CADA UNO
Token. Entrada nueva. Caché (leída y escrita). Salida. Por qué la base se repite en cada mensaje. Por qué lo que Claude escribe es lo más caro.

ESTRUCTURA OBLIGATORIA
1. Título de lección, máximo 8 palabras.
2. Para qué sirve, 2 líneas.
3. Qué medimos, con la tabla de los dos chats (filas: mensajes, entrada nueva, escritos en caché, leídos de caché, salida).
4. Tres cifras para recordar, una línea cada una: −60 % de salida; base igual de ~107 000 por mensaje; −10 a −20 % de costo total.
5. Cómo se lee, 4 viñetas.
6. Qué hacer en casa, 3 pasos: abrir un chat nuevo por tema; pedir con /research-academy; apagar la búsqueda web nativa y dejar solo el conector research-academy-panel.
7. Actividad evaluable: el alumno repite el experimento con su propia tarea y entrega los dos bloques de medición y una línea de conclusión. Rúbrica de 3 criterios con puntaje.
8. Preguntas de autoevaluación: 3 de opción múltiple con respuesta marcada.
9. Nota al pie con las advertencias.

FORMATO
Markdown. Máximo 600 palabras más la tabla. Sin emojis. No afirmes ahorros que no estén en los datos.
