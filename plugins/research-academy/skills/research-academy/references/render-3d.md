# Render 3D realista con three.js (modo directo y panel)

Lo que separa un render de estudio de unas primitivas sueltas. Sale de lo aprendido en Backlot (estudio de video con three.js r170) y es lo mismo que usa el panel `render3d` desde la 0.14.0. Sirve para un objeto suelto: un diente, una botella, una pieza mecánica, un producto.

## Un solo archivo que abre con doble clic

```html
<script type="importmap">{ "imports": {
  "three": "https://unpkg.com/three@0.170.0/build/three.module.js",
  "three/addons/": "https://unpkg.com/three@0.170.0/examples/jsm/" } }</script>
```

Versión fija siempre. Los addons se piden de `three/addons/...`.

## Componentes que no pueden faltar

| Qué | Addon o clase | Para qué |
|---|---|---|
| Luz de entorno | `environments/RoomEnvironment.js` + `PMREMGenerator` → `scene.environment` | Los materiales físicos necesitan algo que reflejar; sin esto se ven de plástico gris. No pide archivos HDR. |
| Tone mapping | `renderer.toneMapping = THREE.ACESFilmicToneMapping`, exposición 0.9–1.0 | Altas luces que no se queman. |
| Tres luces | principal cálida con sombra, relleno frío, contraluz | Volumen y borde separado del fondo. |
| Sombras suaves | `THREE.PCFSoftShadowMap`, `shadow.radius`, `bias` y `normalBias` | Apoyo en el piso sin acné de sombra. Ajusta la cámara de sombra al tamaño del objeto. |
| Oclusión ambiental | `postprocessing/GTAOPass.js` | Pliegues, fisuras y uniones se oscurecen. El radio va en metros: alrededor del 15–20 % del radio del objeto. |
| Bordes limpios | `postprocessing/SMAAPass.js` antes de `OutputPass.js` | |
| Bloom | `UnrealBloomPass` **selectivo** (otro `EffectComposer` donde todo lo que no brilla va en negro y luego se suma con un `ShaderPass`) | Un bloom por umbral lava la imagen entera: un fondo claro o una pieza blanca iluminada pasan cualquier umbral en HDR. |
| Fondo de estudio | piso del mismo color que el fondo + `THREE.Fog` | Sin costura ni horizonte. |
| Cámara de producto | `PerspectiveCamera` de 35°, vista de tres cuartos, distancia = radio / sen(fov/2) × 1.1 | Sin deformación de gran angular. |
| Exportar | `exporters/GLTFExporter.js` (binario) | Para Blender, Unity o la web. |

## Formas: más allá de cajas y esferas

| Forma | Clase | Ejemplos |
|---|---|---|
| Revolución | `THREE.LatheGeometry(perfil)` | botella, vaso, jarrón, copa, perilla, corona dental, tornillo |
| Extrusión | `THREE.ExtrudeGeometry(shape, { depth, bevelEnabled })` | placas, hojas, engranajes, letras |
| Tubo por curva | `THREE.TubeGeometry(new THREE.CatmullRomCurve3(puntos))` | cable, asa, manguera, raíz, rama |
| Caja redondeada | `geometries/RoundedBoxGeometry.js` | celular, mueble, botón |
| **Orgánico fundido** | `objects/MarchingCubes.js` con `addBall` | diente, fruta, animal, cuerpo, roca, nube |

Formas orgánicas: varias esferas, cápsulas y conos se funden en una sola superficie sin costuras.

- Un elipsoide o una cápsula estirada es una fila de bolas a lo largo de su eje.
- El cono es una fila de bolas que se afinan sin volverse gotas sueltas: radio final de al menos el 40 % del inicial.
- Con `isolation` 80 y `subtract` 30, una bola de radio `r` (en el espacio 0–1 del campo) lleva `strength = 110 r²`.
- Copia `positionArray` y `normalArray` (hasta `count × 3`) a una `BufferGeometry` fija, para que proyecte sombra y se exporte a GLB.
- Resolución del campo: 56 para una vista rápida, 96 para el render final.

Diente (muela), de ejemplo:
- la corona es un elipsoide más 4 cúspides;
- el cuello es un elipsoide más estrecho;
- las 3 raíces son conos invertidos;
- todo va en el mismo grupo fundido, con material esmalte.

## Materiales (`MeshPhysicalMaterial`)

| Material | Ajustes |
|---|---|
| esmalte (diente, porcelana) | `roughness 0.22`, `ior 1.62`, `clearcoat 1`, `clearcoatRoughness 0.12`, `transmission 0.12`, `thickness 0.8`, `attenuationColor #f2d9a6`, `sheen 0.2` |
| encía, lengua (tejido húmedo) | `roughness 0.35`, `clearcoat 0.8`, `sheen 0.5` rosado, `transmission 0.05` con atenuación roja |
| piel | `roughness 0.55`, `sheen 0.6` |
| tela | `roughness 0.95`, `sheen 1` |
| cerámica | `roughness 0.18`, `clearcoat 1` |
| vidrio | `transmission 1`, `ior 1.5`, `thickness 0.4`, `roughness 0.03` |
| líquido | `transmission 0.9`, `ior 1.33`, `attenuationColor` = su color |
| metal, cromo, oro | `metalness 1`, `roughness` 0.3, 0.06 y 0.22 |
| emisivo (pantalla, foco) | `emissive` = su color, intensidad 1.5; va en el pase de bloom |

## Errores ya vistos

- **Una escena nueva hereda la posición de la anterior.** Antes de medir la caja del objeto, pon el grupo en `position (0,0,0)` y `rotation (0,0,0)` y detén la animación. Si no, el objeto queda hundido bajo el piso.
- **PNG negro o vacío.** Hace falta `preserveDrawingBuffer: true`. Dibuja con el composer justo antes de `toBlob`.
- **Animación.** GSAP sobre `grupo.rotation.y` (girar) o `grupo.position.y` (flotar). Nunca animes la cámara si hay OrbitControls.
