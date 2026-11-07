// Archivos temporales generados por el panel (PPT, Word, Excel): se guardan 24 horas y se descargan por enlace.
// El iframe del panel no siempre permite descargas directas; el servidor sirve el archivo con su nombre.
import { randomBytes } from 'node:crypto';
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DATA_DIR } from './cerebro.mjs';

export const MAX_ARCHIVO = 10 * 1024 * 1024;
export const VIDA_MS = 24 * 60 * 60 * 1000;
const DIR = () => join(DATA_DIR, 'archivos');
const TIPOS = {
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv; charset=utf-8',
  md: 'text/markdown; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
  json: 'application/json; charset=utf-8',
  png: 'image/png',
  pdf: 'application/pdf',
  glb: 'model/gltf-binary',
  js: 'text/javascript; charset=utf-8', ts: 'text/plain; charset=utf-8', jsx: 'text/plain; charset=utf-8', html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', py: 'text/x-python; charset=utf-8', sql: 'text/plain; charset=utf-8', java: 'text/plain; charset=utf-8', php: 'text/plain; charset=utf-8', sh: 'text/plain; charset=utf-8', yaml: 'text/yaml; charset=utf-8', zip: 'application/zip',
};

export const nombreSeguro = (n) => String(n || 'archivo').normalize('NFKD').replace(/[^\w.\-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'archivo';
export const extensionDe = (n) => String(n).toLowerCase().split('.').pop();
export const tipoDe = (n) => TIPOS[extensionDe(n)];
export const idValido = (id) => /^[a-f0-9]{24}$/.test(id);

export async function guardarArchivo(nombre, buffer) {
  const limpio = nombreSeguro(nombre);
  if (!tipoDe(limpio)) throw Object.assign(new Error('tipo de archivo no admitido'), { status: 415 });
  if (buffer.length > MAX_ARCHIVO) throw Object.assign(new Error('archivo mayor a 10 MB'), { status: 413 });
  const id = randomBytes(12).toString('hex');
  await mkdir(join(DIR(), id), { recursive: true });
  await writeFile(join(DIR(), id, limpio), buffer);
  return { id, nombre: limpio, bytes: buffer.length, vence: new Date(Date.now() + VIDA_MS).toISOString() };
}

export async function rutaArchivo(id, nombre) {
  if (!idValido(id)) throw Object.assign(new Error('id inválido'), { status: 400 });
  const limpio = nombreSeguro(nombre);
  const ruta = join(DIR(), id, limpio);
  const s = await stat(ruta).catch(() => null);
  if (!s || !s.isFile()) throw Object.assign(new Error('archivo no encontrado o vencido'), { status: 404 });
  return { ruta, tipo: tipoDe(limpio) || 'application/octet-stream', nombre: limpio, bytes: s.size };
}

// Borra carpetas con más de 24 horas. Se llama al arrancar y cada hora.
export async function limpiarVencidos() {
  let borrados = 0;
  const base = DIR();
  const ids = await readdir(base).catch(() => []);
  for (const id of ids) {
    const s = await stat(join(base, id)).catch(() => null);
    if (s && Date.now() - s.mtimeMs > VIDA_MS) { await rm(join(base, id), { recursive: true, force: true }); borrados++; }
  }
  return borrados;
}
