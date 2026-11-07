// Almacén del "cerebro": notas de investigación del alumno, un archivo JSON por cerebro.
// El id es el SHA-256 de la frase clave del alumno (lo calcula el panel o la herramienta); el servidor
// solo ve el hash. No hay cuentas. Tope 2 MB por cerebro. Escritura atómica (tmp + rename).
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

export const DATA_DIR = process.env.DATA_DIR || join(process.cwd(), 'datos');
export const MAX_BYTES = 2 * 1024 * 1024;
const ID_RE = /^[a-f0-9]{64}$/;

export const idDeFrase = (frase) => createHash('sha256').update(String(frase).trim().normalize('NFC')).digest('hex');
export const idValido = (id) => ID_RE.test(id);
// Codigo de solo lectura: 12 hex derivados del id. Quien lo tenga puede leer, no escribir.
export const codigoLectura = (id) => createHash('sha256').update('lectura:' + id).digest('hex').slice(0, 12);
export const codigoValido = (c) => /^[a-f0-9]{12}$/.test(c);
const rutaLectura = (codigo) => join(DATA_DIR, 'lectura', `${codigo}.json`);
export async function registrarLectura(id) {
  await mkdir(join(DATA_DIR, 'lectura'), { recursive: true });
  const codigo = codigoLectura(id);
  await writeFile(rutaLectura(codigo), JSON.stringify({ id }), 'utf8');
  return codigo;
}
export async function leerPorCodigo(codigo) {
  if (!codigoValido(codigo)) throw Object.assign(new Error('código inválido'), { status: 400 });
  try {
    const { id } = JSON.parse(await readFile(rutaLectura(codigo), 'utf8'));
    return leerCerebro(id);
  } catch (e) {
    if (e.code === 'ENOENT') throw Object.assign(new Error('código no encontrado'), { status: 404 });
    throw e;
  }
}
export function cerebroMarkdown(notas) {
  const grupos = new Map();
  for (const n of notas) { const t = n.tema || '(sin tema)'; if (!grupos.has(t)) grupos.set(t, []); grupos.get(t).push(n); }
  let md = `# Cerebro Research Academy\n\nExportado ${new Date().toISOString().slice(0, 10)} · ${notas.length} notas\n`;
  for (const [tema, ns] of grupos) {
    md += `\n## ${tema}\n`;
    for (const n of ns) {
      md += `\n### ${n.pregunta} (${String(n.fecha || '').slice(0, 10)})\n`;
      for (const h of n.hallazgos || []) md += `- ${h}\n`;
      for (const f of n.fuentes || []) md += `- Fuente: ${f.url}\n`;
      if (n.respuesta) md += `\n${String(n.respuesta).slice(0, 4000)}\n`;
    }
  }
  return md;
}
const ruta = (id) => join(DATA_DIR, 'cerebro', `${id}.json`);

export async function leerCerebro(id) {
  if (!idValido(id)) throw Object.assign(new Error('id inválido'), { status: 400 });
  try {
    return JSON.parse(await readFile(ruta(id), 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return { notas: [], actualizado: null };
    throw e;
  }
}

export async function guardarCerebro(id, cuerpo) {
  if (!idValido(id)) throw Object.assign(new Error('id inválido'), { status: 400 });
  if (!cuerpo || !Array.isArray(cuerpo.notas)) throw Object.assign(new Error('se espera {notas: []}'), { status: 400 });
  const notas = cuerpo.notas.filter((n) => n && typeof n.id === 'string' && typeof n.pregunta === 'string');
  const doc = { notas, actualizado: new Date().toISOString() };
  const texto = JSON.stringify(doc);
  if (Buffer.byteLength(texto) > MAX_BYTES) throw Object.assign(new Error(`cerebro mayor a ${MAX_BYTES / 1024 / 1024} MB`), { status: 413 });
  await mkdir(join(DATA_DIR, 'cerebro'), { recursive: true });
  const tmp = ruta(id) + '.tmp';
  await writeFile(tmp, texto, 'utf8');
  await rename(tmp, ruta(id));
  const codigo = await registrarLectura(id);
  return { actualizado: doc.actualizado, notas: notas.length, bytes: Buffer.byteLength(texto), codigo_lectura: codigo };
}

// Búsqueda simple por palabras en tema, pregunta, hallazgos y etiquetas. Devuelve las notas más recientes que coinciden.
export function buscarNotas(notas, tema, max = 5) {
  const terminos = String(tema || '').toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  const texto = (n) => [n.tema, n.pregunta, ...(n.hallazgos || []), ...(n.etiquetas || [])].join(' ').toLowerCase();
  const puntaje = (n) => terminos.reduce((s, t) => s + (texto(n).includes(t) ? 1 : 0), 0);
  const lista = terminos.length ? notas.map((n) => [puntaje(n), n]).filter(([p]) => p > 0) : notas.map((n) => [0, n]);
  return lista
    .sort((a, b) => b[0] - a[0] || String(b[1].fecha || '').localeCompare(String(a[1].fecha || '')))
    .slice(0, max)
    .map(([, n]) => n);
}

export function resumirNotas(notas) {
  if (!notas.length) return 'No hay notas guardadas que coincidan.';
  return notas
    .map((n) => {
      const h = (n.hallazgos || []).map((x) => `  - ${x}`).join('\n');
      const f = (n.fuentes || []).slice(0, 3).map((x) => `  - ${x.url}`).join('\n');
      return `Tema: ${n.tema || '(sin tema)'} · ${String(n.fecha || '').slice(0, 10)}\nPregunta: ${n.pregunta}\nHallazgos:\n${h || '  - (sin hallazgos)'}${f ? `\nFuentes:\n${f}` : ''}`;
    })
    .join('\n\n');
}

export async function estadoAlmacen() {
  try {
    const s = await stat(join(DATA_DIR, 'cerebro'));
    return { dir: DATA_DIR, existe: s.isDirectory() };
  } catch {
    return { dir: DATA_DIR, existe: false };
  }
}
