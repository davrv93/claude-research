---
name: plantillas-carrera
description: Atajos por carrera u oficio para alumnos de Research Academy: contabilidad, ventas, tiendas y bodegas, tesis y educacion, software. Usar cuando el alumno diga su carrera o tarea tipica (cierre mensual, campana, inventario, capitulo de tesis, examen) y no sepa que pedir.
---

# Plantillas por carrera

Cada atajo nombra la herramienta del panel que lo resuelve. Confirma en una linea que entendiste y llama a la herramienta; no expliques el kit. Pie `Consumo:` como en research-academy.

## Contabilidad
- Cierre mensual: `docs_analizar(accion: "corregir")` sobre su Excel, luego `docs_crear(excel, "resumen de cierre con IGV, ventas, compras y saldo")`.
- Caja diaria o flujo de caja: `docs_crear(excel, "caja diaria con ingresos, egresos, saldo acumulado y resumen mensual")`.
- IGV o margen: `calcular(igv)` o `calcular(margen)`.
- Normativa vigente (RMV, tasas, plazos SUNAT): `investigar`.

## Ventas y marketing
- Campana: `plan-trabajo` para el plan, `docs_crear(word, "guion de campana")`, `docs_analizar(accion: "redes")` con la foto del producto.
- Seguimiento de clientes: `docs_analizar(accion: "limpiar")` y luego `docs_analizar(accion: "mensajes")` con la lista.
- Comparar meses: `docs_analizar(accion: "comparar")`.
- Precios de competencia o tendencias: `investigar`.

## Tiendas y bodegas
- Inventario: `docs_crear(excel, "inventario con stock minimo, reposicion y valorizado")`.
- Conteo fisico contra sistema: `docs_analizar(accion: "comparar")`.
- Boletas o cuaderno en foto: `docs_analizar(accion: "ocr")`.
- Grafico de ventas para WhatsApp: `docs_analizar(accion: "graficar")`.
- Prestamo para crecer: `calcular(prestamo)`.

## Tesis y educacion
- Indice y cronograma: `plan-trabajo`.
- Estado del arte: `investigar` por subtema, guardar en el cerebro, `mapa` para ordenar.
- Capitulo nuevo en el Word: `docs_analizar(accion: "anadir")` con busqueda.
- Referencias: `citar(urls)` o `docs_analizar(accion: "referencias")`.
- Fichas y examen de practica: `docs_analizar(accion: "estudiar")` con el PDF.
- Revisar originalidad de un trabajo: `docs_analizar(accion: "originalidad")`.
- Clase grabada: `docs_analizar` con el audio (transcripcion y resumen).

## Software y datos
- Explicar un concepto: `delegar`.
- Version o API actual de una libreria: `investigar`.
- Limpiar un CSV: `docs_analizar(accion: "limpiar")`.
- Codigo propio: directo en Claude.
