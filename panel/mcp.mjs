// Servidor MCP del panel de delegación. No guarda llaves ni llama a ningún modelo: solo registra las
// herramientas y entrega panel.html. La consulta la hace el panel desde el navegador del usuario, con su
// propia llave de OpenRouter, para que la respuesta no entre al contexto de Claude.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { z } from 'zod';
import { buscarNotas, codigoLectura, idDeFrase, leerCerebro, leerPorCodigo, resumirNotas } from './cerebro.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
export const PANEL_URI = 'ui://research-academy/panel';
export const DOCS_URI = 'ui://research-academy/docs';
export const CONFIG_URI = 'ui://research-academy/config';
export const CODIGO_URI = 'ui://research-academy/codigo';
export const TRES_URI = 'ui://research-academy/3d';
export const MODELO_POR_DEFECTO = 'nvidia/nemotron-3-ultra-550b-a55b:free';
export const VERSION = '0.12.2';

// Metadatos de la interfaz: a qué dominios puede conectarse el panel y de dónde carga módulos.
export function metaUi() {
  const ui = {
    csp: {
      connectDomains: ['https://openrouter.ai', 'https://mcp.parallel.ai', 'https://generativelanguage.googleapis.com', 'https://api.groq.com', 'https://api.cerebras.ai', 'https://api.mistral.ai', ...(cerebroUrl() ? [new URL(cerebroUrl()).origin] : [])],
      resourceDomains: ['https://unpkg.com', 'https://cdnjs.cloudflare.com', ...(cerebroUrl() ? [new URL(cerebroUrl()).origin] : [])],
    },
    permissions: { clipboardWrite: {} },
    prefersBorder: true,
  };
  // Origen estable del panel en claude.ai: así localStorage (la llave) sobrevive entre conversaciones.
  const url = process.env.SERVER_URL;
  if (url) ui.domain = createHash('sha256').update(url).digest('hex').slice(0, 32) + '.claudemcpcontent.com';
  return ui;
}

// Base del almacén del cerebro: CEREBRO_URL explícita, o SERVER_URL sin /mcp. Vacío = solo local.
export const cerebroUrl = () => (process.env.CEREBRO_URL || (process.env.SERVER_URL ? process.env.SERVER_URL.replace(/\/mcp\/?$/, '') : '')).replace(/\/$/, '');

const esGratis = (modelo) => typeof modelo === 'string' && modelo.endsWith(':free');

const rechazo = (modelo) => ({
  isError: true,
  content: [{ type: 'text', text: `Modelo rechazado: «${modelo}» no termina en :free. Este panel solo usa modelos gratuitos de OpenRouter.` }],
});

const linea = (modelo) => ({
  type: 'text',
  text: `Panel abierto con ${modelo}. El alumno ve la respuesta ahí. Responde solo: 'Listo, revisa el panel.' más el pie Consumo.`,
});

const NO_REPETIR =
  'La respuesta se muestra al usuario en un panel y NO llega a ti. No repitas, no resumas ni completes lo que muestra el panel; ' +
  "responde solo «Listo, revisa el panel.» y el pie de consumo.";

const modelo = z
  .string()
  .default(MODELO_POR_DEFECTO)
  .describe('Id de un modelo gratuito de OpenRouter; debe terminar en :free.');
const maxPalabras = z.number().int().min(20).max(1200).default(150).describe('Largo máximo de la respuesta, en palabras.');

export function buildServer() {
  const server = new McpServer({ name: 'research-academy-panel', version: VERSION });

  registerAppTool(
    server,
    'delegar',
    {
      title: 'Delegar a un modelo gratuito',
      description:
        'Envía una pregunta a un modelo gratuito de OpenRouter. El modelo la responde en español dentro de un panel que ve el usuario. ' +
        NO_REPETIR,
      inputSchema: {
        pregunta: z.string().min(1).describe('La pregunta, en español, tal como la debe responder el modelo externo.'),
        modelo,
        max_palabras: maxPalabras,
      },
      _meta: { ui: { resourceUri: PANEL_URI } },
    },
    async ({ pregunta, modelo, max_palabras }) => {
      if (!esGratis(modelo)) return rechazo(modelo);
      return { content: [linea(modelo)], structuredContent: { modo: 'delegar', pregunta, modelo, max_palabras } };
    },
  );

  registerAppTool(
    server,
    'investigar',
    {
      title: 'Investigar en la web con un modelo gratuito',
      description:
        'Busca en la web (Parallel) con 1 a 3 consultas cortas y pide a un modelo gratuito de OpenRouter una respuesta en español ' +
        'que cite solo esas fuentes con [n]. Todo ocurre en un panel que ve el usuario. ' +
        NO_REPETIR,
      inputSchema: {
        pregunta: z.string().min(1).describe('Lo que se quiere averiguar, en español.'),
        consultas: z
          .array(
            z
              .string()
              .refine((s) => {
                const n = s.trim().split(/\s+/).filter(Boolean).length;
                return n >= 3 && n <= 6;
              }, 'Cada consulta debe tener de 3 a 6 palabras.'),
          )
          .min(1)
          .max(3)
          .describe('De 1 a 3 consultas de búsqueda, de 3 a 6 palabras cada una.'),
        modelo,
        max_palabras: maxPalabras,
      },
      _meta: { ui: { resourceUri: PANEL_URI } },
    },
    async ({ pregunta, consultas, modelo, max_palabras }) => {
      if (!esGratis(modelo)) return rechazo(modelo);
      return { content: [linea(modelo)], structuredContent: { modo: 'investigar', pregunta, consultas, modelo, max_palabras } };
    },
  );

  registerAppTool(
    server,
    'mapa',
    {
      title: 'Mapa mental del cerebro del alumno',
      description:
        'Muestra en el panel el mapa mental de lo que el alumno ha guardado en su cerebro (temas, hallazgos y fuentes de investigaciones anteriores). ' +
        'Usar cuando pida ver, repasar u organizar lo investigado. ' +
        NO_REPETIR,
      inputSchema: {
        tema: z.string().optional().describe('Tema para filtrar el mapa; vacío muestra todo.'),
      },
      _meta: { ui: { resourceUri: PANEL_URI } },
    },
    async ({ tema }) => ({
      content: [{ type: 'text', text: `Mapa mental abierto en el panel${tema ? ` (tema: ${tema})` : ''}. Responde solo: 'Listo, revisa el panel.' más el pie Consumo.` }],
      structuredContent: { modo: 'mapa', tema: tema || '' },
    }),
  );

  server.registerTool(
    'cerebro_buscar',
    {
      title: 'Buscar en el cerebro del alumno',
      description:
        'Recupera hallazgos guardados en el cerebro del alumno para usarlos en el chat. Solo cuando el alumno lo pide y da su frase clave. ' +
        'Devuelve hasta 5 notas resumidas (tema, hallazgos, fuentes); sí entran al contexto de Claude.',
      inputSchema: {
        frase_clave: z.string().optional().describe('La frase clave del cerebro del alumno, tal como la escribió en el panel.'),
        codigo_lectura: z.string().optional().describe('Código de solo lectura de 12 caracteres que un alumno compartió (docente o asesor). Alternativa a la frase.'),
        tema: z.string().optional().describe('Palabras del tema a buscar; vacío devuelve las 5 notas más recientes.'),
      },
    },
    async ({ frase_clave, codigo_lectura, tema }) => {
      if (!frase_clave && !codigo_lectura) return { isError: true, content: [{ type: 'text', text: 'Falta la frase clave o un código de lectura.' }] };
      const cerebro = codigo_lectura ? await leerPorCodigo(codigo_lectura.trim().toLowerCase()) : await leerCerebro(idDeFrase(frase_clave));
      const notas = buscarNotas(cerebro.notas, tema);
      return {
        content: [{ type: 'text', text: `${notas.length} de ${cerebro.notas.length} notas.\n\n${resumirNotas(notas)}` }],
        structuredContent: { total: cerebro.notas.length, devueltas: notas.length },
      };
    },
  );

  registerAppTool(
    server,
    'docs_analizar',
    {
      title: 'Analizar un archivo del alumno (Excel, CSV, PDF, Word)',
      description:
        'Abre el panel Documentos: el alumno suelta ahí su archivo (Excel, CSV, PDF, Word, una foto o un audio). El panel lo lee en el navegador, calcula estructura, estadísticas y fórmulas, ' +
        'y un modelo gratuito lo analiza. El archivo NUNCA pasa por Claude. Úsalo cuando el alumno quiera analizar, resumir, corregir, hacer un informe o un PPT ' +
        'a partir de un archivo, o añadir contenido a un Word. Tras llamar, responde solo: "Listo, suelta el archivo en el panel." más el pie Consumo. ' +
        'Cuando el alumno envíe el contexto desde el panel, confirma en 2 líneas lo entendido y pregunta la acción si no vino indicada.',
      inputSchema: {
        instruccion: z.string().default('').describe('Lo que el alumno quiere hacer con el archivo, en sus palabras.'),
        accion: z.enum(['', 'resumen', 'informe', 'ppt', 'corregir', 'anadir', 'referencias', 'estudiar', 'originalidad', 'ocr', 'redes', 'graficar', 'comparar', 'limpiar', 'mensajes', 'convertir', 'excel_corregir']).default('').describe('Acción pedida si está clara: resumen, informe, ppt, corregir (redacción o fórmulas), anadir (sección a Word), referencias, estudiar (fichas y cuestionario), originalidad (frases copiadas), ocr (foto a tabla), redes (texto para redes desde una foto), graficar, comparar (dos Excel), limpiar (datos), mensajes (personalizados desde una lista), convertir (PDF a Word, Excel a PDF). Vacío si solo quiere analizar.'),
        modelo,
      },
      _meta: { ui: { resourceUri: DOCS_URI } },
    },
    async ({ instruccion, accion, modelo }) => {
      if (!esGratis(modelo)) return rechazo(modelo);
      return {
        content: [{ type: 'text', text: `Panel Documentos abierto con ${modelo}. El alumno suelta el archivo ahí y luego lo envía al chat si quiere. Responde solo: "Listo, suelta el archivo en el panel." más el pie Consumo.` }],
        structuredContent: { modo: 'docs', instruccion, accion, modelo },
      };
    },
  );

  registerAppTool(
    server,
    'docs_crear',
    {
      title: 'Crear un Excel o Word desde cero',
      description:
        'Abre el panel Documentos para crear un archivo nuevo sin partir de otro: una plantilla de Excel con fórmulas (inventario, caja, planilla, presupuesto) ' +
        'o un Word (informe, carta, solicitud, contrato simple). Lo redacta un modelo gratuito y el panel genera el archivo; nada pasa por Claude. ' +
        NO_REPETIR.replace('Listo, revisa el panel.', 'Listo, genera el archivo en el panel.'),
      inputSchema: {
        tipo: z.enum(['excel', 'word']).describe('excel o word'),
        instruccion: z.string().min(3).describe('Qué debe contener, en palabras del alumno.'),
        modelo,
      },
      _meta: { ui: { resourceUri: DOCS_URI } },
    },
    async ({ tipo, instruccion, modelo }) => {
      if (!esGratis(modelo)) return rechazo(modelo);
      return { content: [{ type: 'text', text: `Panel Documentos abierto para crear un ${tipo}. Responde solo: "Listo, genera el archivo en el panel." más el pie Consumo.` }], structuredContent: { modo: 'docs', accion: 'crear', tipo, instruccion, modelo } };
    },
  );

  registerAppTool(
    server,
    'citar',
    {
      title: 'Citas en APA desde URLs',
      description: 'Genera referencias en APA 7 a partir de una lista de URLs, en el panel; el alumno las copia. ' + NO_REPETIR,
      inputSchema: { urls: z.array(z.string().url()).min(1).max(10).describe('URLs a citar.'), modelo },
      _meta: { ui: { resourceUri: PANEL_URI } },
    },
    async ({ urls, modelo }) => {
      if (!esGratis(modelo)) return rechazo(modelo);
      return { content: [{ type: 'text', text: `Panel abierto con ${urls.length} URL(s) para citar. Responde solo: 'Listo, revisa el panel.' más el pie Consumo.` }], structuredContent: { modo: 'citar', urls, modelo } };
    },
  );

  registerAppTool(
    server,
    'calcular',
    {
      title: 'Calculadoras fijas',
      description: 'Abre en el panel una calculadora: igv, punto_equilibrio, prestamo (cuota fija), margen (precio y margen). Sin modelo ni Claude. ' + NO_REPETIR,
      inputSchema: { tipo: z.enum(['igv', 'punto_equilibrio', 'prestamo', 'margen']).describe('Calculadora a abrir.') },
      _meta: { ui: { resourceUri: PANEL_URI } },
    },
    async ({ tipo }) => ({ content: [{ type: 'text', text: `Calculadora ${tipo} abierta en el panel. Responde solo: 'Listo, revisa el panel.' más el pie Consumo.` }], structuredContent: { modo: 'calcular', tipo } }),
  );

  server.registerTool(
    'cerebro_compartir',
    {
      title: 'Código de solo lectura del cerebro',
      description: 'Devuelve el código de 12 caracteres con el que un docente o asesor puede leer el cerebro del alumno (sin escribir). Solo cuando el alumno lo pide y da su frase clave.',
      inputSchema: { frase_clave: z.string().min(4) },
    },
    async ({ frase_clave }) => {
      const id = idDeFrase(frase_clave);
      const c = await leerCerebro(id);
      return { content: [{ type: 'text', text: c.notas.length ? `Código de lectura: ${codigoLectura(id)} (${c.notas.length} notas). Quien lo tenga puede leer, no modificar. Se usa en el panel Research («Ver cerebro compartido») o con cerebro_buscar(codigo_lectura).` : 'Ese cerebro no tiene notas todavía.' }] };
    },
  );

  registerAppTool(
    server,
    'configurar',
    {
      title: 'Configuración del kit',
      description: 'Abre el panel Configuración: autorizar OpenRouter, guardar llaves de Gemini, Groq, Cerebras o Mistral (solo en el navegador del alumno), orden de proveedores por tarea, frase clave del cerebro y permisos. Úsalo cuando el alumno pida configurar, conectar un proveedor, poner su llave, o cuando otro panel diga que falta configuración. Nunca pidas la llave en el chat. ' + NO_REPETIR.replace('Listo, revisa el panel.', 'Listo, configura en el panel.'),
      inputSchema: {},
      _meta: { ui: { resourceUri: CONFIG_URI } },
    },
    async () => ({ content: [{ type: 'text', text: 'Panel Configuración abierto. Responde solo: "Listo, configura en el panel; las llaves se pegan ahí, nunca en el chat." más el pie Consumo.' }], structuredContent: { modo: 'config' } }),
  );

  registerAppTool(
    server,
    'codigo',
    {
      title: 'Código con proveedores gratuitos',
      description: 'Abre el panel Código: escribir, corregir un error, explicar, revisar, escribir tests o convertir código con Gemini, Mistral, Groq, Cerebras u OpenRouter (según lo configurado), con vista previa de HTML y ejecución de JavaScript. Para snippets, errores y ejercicios. Arquitectura, refactors grandes o revisión de seguridad: hazlos tú en el chat. ' + NO_REPETIR,
      inputSchema: {
        accion: z.enum(['escribir', 'corregir', 'explicar', 'revisar', 'tests', 'convertir']).default('escribir'),
        lenguaje: z.enum(['javascript', 'typescript', 'html', 'css', 'python', 'sql', 'java', 'php', 'bash', 'react', 'otro']).default('javascript'),
        instruccion: z.string().default('').describe('Qué necesita el alumno, en sus palabras.'),
        codigo: z.string().max(6000).default('').describe('Código o error que pegó el alumno, si es corto; si es largo, que lo pegue en el panel.'),
      },
      _meta: { ui: { resourceUri: CODIGO_URI } },
    },
    async ({ accion, lenguaje, instruccion, codigo }) => ({ content: [{ type: 'text', text: `Panel Código abierto (${accion}, ${lenguaje}). Responde solo: 'Listo, revisa el panel.' más el pie Consumo.` }], structuredContent: { modo: 'codigo', accion, lenguaje, instruccion, codigo } }),
  );

  registerAppTool(
    server,
    'render3d',
    {
      title: 'Objeto en 3D',
      description: 'Abre el panel 3D: a partir de una descripción o de una foto de referencia que el alumno suelta en el panel, un modelo gratuito compone el objeto con primitivas y el panel lo renderiza en three.js con órbita, animación (GSAP), edición de piezas, y descarga PNG y GLB. ' + NO_REPETIR,
      inputSchema: {
        descripcion: z.string().default('').describe('El objeto a modelar, en palabras del alumno; vacío si va a subir una foto.'),
        estilo: z.enum(['realista', 'lowpoly', 'juguete', 'esquema']).default('realista'),
      },
      _meta: { ui: { resourceUri: TRES_URI } },
    },
    async ({ descripcion, estilo }) => ({ content: [{ type: 'text', text: `Panel 3D abierto${descripcion ? ` para «${descripcion.slice(0, 60)}»` : ''}. Responde solo: 'Listo, revisa el panel.' más el pie Consumo.` }], structuredContent: { modo: '3d', descripcion, estilo } }),
  );

  for (const [uri, archivo, nombre, desc] of [[CONFIG_URI, 'config.html', 'Configuración de Research Academy', 'Llaves, proveedores y preferencias, solo en el navegador del alumno.'], [CODIGO_URI, 'codigo.html', 'Panel Código de Research Academy', 'Código con proveedores gratuitos, vista previa y ejecución.'], [TRES_URI, 'tres.html', 'Panel 3D de Research Academy', 'Objetos en 3D con three.js a partir de texto o foto.']]) {
    registerAppResource(server, nombre, uri, { description: desc, mimeType: RESOURCE_MIME_TYPE, _meta: { ui: metaUi() } }, async () => ({
      contents: [{ uri, mimeType: RESOURCE_MIME_TYPE, text: (await readFile(join(AQUI, archivo), 'utf8')).split('__CEREBRO_URL__').join(cerebroUrl()), _meta: { ui: metaUi() } }],
    }));
  }

  registerAppResource(
    server,
    'Panel Documentos de Research Academy',
    DOCS_URI,
    { description: 'Panel donde el alumno suelta un archivo y lo analiza sin pasar por Claude.', mimeType: RESOURCE_MIME_TYPE, _meta: { ui: metaUi() } },
    async () => ({
      contents: [{ uri: DOCS_URI, mimeType: RESOURCE_MIME_TYPE, text: (await readFile(join(AQUI, 'docs.html'), 'utf8')).split('__CEREBRO_URL__').join(cerebroUrl()), _meta: { ui: metaUi() } }],
    }),
  );

  registerAppResource(
    server,
    'Panel de Research Academy',
    PANEL_URI,
    { description: 'Panel donde el usuario ve la respuesta del modelo gratuito.', mimeType: RESOURCE_MIME_TYPE, _meta: { ui: metaUi() } },
    async () => ({
      contents: [
        {
          uri: PANEL_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: (await readFile(join(AQUI, 'panel.html'), 'utf8')).replace('__CEREBRO_URL__', cerebroUrl()),
          _meta: { ui: metaUi() },
        },
      ],
    }),
  );

  return server;
}
