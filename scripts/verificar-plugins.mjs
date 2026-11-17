#!/usr/bin/env node
// Revisa que los manifiestos de los cinco clientes (Claude, Codex, Cursor,
// Antigravity y DeepSeek Harness) sean JSON válido, compartan versión y apunten
// a skills con frontmatter que todos aceptan. Uso: node scripts/verificar-plugins.mjs
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PLUGIN = join(RAIZ, 'plugins/research-academy');
const fallos = [];
const mal = (m) => fallos.push(m);
const json = (ruta) => {
  try { return JSON.parse(readFileSync(join(RAIZ, ruta), 'utf8')); }
  catch (e) { mal(`${ruta}: ${e.message}`); return {}; }
};

const manifiestos = {
  claude: json('plugins/research-academy/.claude-plugin/plugin.json'),
  codex: json('plugins/research-academy/.codex-plugin/plugin.json'),
  cursor: json('plugins/research-academy/.cursor-plugin/plugin.json'),
  antigravity: json('plugins/research-academy/.antigravity-plugin/plugin.json'),
  dsh: json('plugins/research-academy/package.json'),
};
const mercados = {
  claude: json('.claude-plugin/marketplace.json'),
  codex: json('.agents/plugins/marketplace.json'),
  cursor: json('.cursor-plugin/marketplace.json'),
};
json('plugins/research-academy/.mcp.json');
json('plugins/research-academy/mcp.json');

// Misma versión en todos.
const versiones = Object.entries(manifiestos).map(([k, m]) => [k, m.version]);
if (new Set(versiones.map(([, v]) => v)).size !== 1) mal(`versiones distintas: ${versiones.map((x) => x.join('=')).join(', ')}`);

// Nombre en kebab-case (Codex, Cursor, Antigravity).
for (const k of ['claude', 'codex', 'cursor', 'antigravity']) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(manifiestos[k].name ?? '')) mal(`${k}: nombre inválido «${manifiestos[k].name}»`);
}

// Antigravity tiene esquema cerrado.
const AG = ['$schema', 'name', 'displayName', 'description', 'version', 'disabled', 'logo', 'suggestedPrompts', 'skills', 'author', 'homepage', 'repository', 'license', 'keywords'];
for (const campo of Object.keys(manifiestos.antigravity)) if (!AG.includes(campo)) mal(`antigravity: campo no admitido «${campo}»`);
if ((manifiestos.antigravity.suggestedPrompts ?? []).length > 3) mal('antigravity: más de 3 suggestedPrompts');

// Codex: rutas relativas con ./ y marketplace con policy y category.
for (const campo of ['skills', 'mcpServers', 'apps', 'hooks']) {
  const v = manifiestos.codex[campo];
  if (v !== undefined && !String(v).startsWith('./')) mal(`codex: ${campo} debe empezar con ./`);
}
for (const p of mercados.codex.plugins ?? []) {
  if (!p.policy?.installation || !p.policy?.authentication || !p.category) mal(`codex marketplace: a «${p.name}» le falta policy o category`);
  if (!existsSync(join(RAIZ, p.source?.path ?? p.source ?? '', '.codex-plugin/plugin.json'))) mal(`codex marketplace: «${p.name}» no apunta a un .codex-plugin/plugin.json`);
}
for (const p of mercados.cursor.plugins ?? []) {
  if (!existsSync(join(RAIZ, p.source, '.cursor-plugin/plugin.json'))) mal(`cursor marketplace: «${p.name}» no apunta a un .cursor-plugin/plugin.json`);
}

// dsh: bundle declarado y skills dentro de los archivos publicados.
if (manifiestos.dsh.dsh?.bundle?.patch !== './cordis.patch.yml') mal('dsh: falta dsh.bundle.patch');
if (!(manifiestos.dsh.files ?? []).includes('skills')) mal('dsh: «skills» no está en files');

// Skills: nombre = carpeta y description entre comillas (dsh descarta YAML con «: » suelto).
const SKILLS = join(PLUGIN, 'skills');
for (const nombre of readdirSync(SKILLS)) {
  const ruta = join(SKILLS, nombre, 'SKILL.md');
  if (!existsSync(ruta)) continue;
  const texto = readFileSync(ruta, 'utf8');
  const front = texto.match(/^---\n([\s\S]*?)\n---/);
  if (!front) { mal(`${nombre}: sin frontmatter`); continue; }
  const campos = Object.fromEntries(front[1].split('\n').map((l) => l.match(/^([a-z-]+):\s*(.*)$/)).filter(Boolean).map((m) => [m[1], m[2]]));
  if (campos.name !== nombre) mal(`${nombre}: name «${campos.name}» no coincide con la carpeta`);
  const d = campos.description ?? '';
  if (!d) mal(`${nombre}: sin description`);
  const entreComillas = /^"(?:[^"\\]|\\.)*"$/.test(d);
  if (!entreComillas && d.includes(': ')) mal(`${nombre}: description con «: » sin comillas (YAML inválido para dsh)`);
  if (d.length > 1024 + 2) mal(`${nombre}: description de ${d.length} caracteres (máximo 1024)`);
}

if (fallos.length) { console.error(fallos.map((f) => `✗ ${f}`).join('\n')); process.exit(1); }
console.log(`✓ manifiestos y skills en orden (versión ${versiones[0][1]})`);
