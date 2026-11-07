# Como medir consumo durante el taller (Claude Pro + MCP)

## Dos contadores distintos

1. OpenRouter: la respuesta `send-message` puede reportar modelo, tokens de entrada/salida, costo y generation id. Son los tokens DEL MODELO EXTERNO, no los de Claude.
2. Claude Pro: ir a **Claude > Configuracion > Uso**. Anotar porcentaje usado de sesion de cinco horas y, opcionalmente, porcentaje semanal antes y despues. En el plan Pro no hay un contador publico y documentado que entregue a la Skill los tokens exactos de cada respuesta en la interfaz Claude.

## Prueba de aula de 5 minutos

- Anotar fecha/hora, modelo Claude activo y porcentaje inicial de sesion. Comprobar que no hubo reinicio.
- Abrir una conversacion nueva y escribir 'research-academy explica el vuelo del colibri en 100 palabras'.
- Leer el pie 'Consumo' y anotar los metadatos disponibles. No confundirlos con el costo de Claude.
- Consultar otra vez Configuracion > Uso y anotar el porcentaje final.
- Calcular variacion = final - inicial (puntos porcentuales). Si no cambian las barras visibles, registrar 'sin variacion visible', no 'sin consumo'.
- Para una comparacion controlada, repetir varias veces en conversaciones nuevas, con el mismo modelo/ajustes, unas veces con el MCP y otras sin el MCP, alternando el orden. Comparar la distribucion de variaciones; una sola prueba no demuestra ahorro y cambios de cuota pueden depender de otros factores.

## Tabla de registro

| Tarea | Ruta | Claude antes (%) | Claude despues (%) | Variacion (p.p.) | Tokens OpenRouter | Costo OpenRouter |
|---|---|---:|---:|---:|---:|---|
| Colibri | OpenRouter |  |  |  |  |  |
| Colibri | Sin MCP |  |  |  | No aplica | No aplica |

## Explicacion didactica

No sumes porcentajes de Claude con tokens de OpenRouter. Claude tambien consume cuota por seleccionar herramientas, leer los resultados y presentar la respuesta. Cuando una investigacion externa evita resultados extensos o varias iteraciones, PUEDE ser eficiente, pero necesita una comparacion para demostrarlo.
