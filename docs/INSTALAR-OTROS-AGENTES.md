# Research Academy en Codex, Cursor, Antigravity y DeepSeek Harness

Un mismo repositorio y una misma carpeta de plugin, `plugins/research-academy/`, con un manifiesto por cliente. Las tres skills (`research-academy`, `plan-trabajo` y `plantillas-carrera`) son las mismas en todos los clientes.

## Qué cambia según el cliente

El panel `research-academy-panel` es una MCP App: una ventana dentro del chat. Solo la dibujan claude.ai, Claude Desktop y Cursor. En los demás, sus herramientas contestarían «revisa el panel» y el alumno no vería nada. Por eso:

| Cliente | Manifiesto | Panel | Cómo trabaja |
|---|---|---|---|
| Claude (web y Desktop) | `.claude-plugin/plugin.json` | Sí (`.mcp.json`) | Modo panel, como hasta ahora |
| Cursor | `.cursor-plugin/plugin.json` | Sí (`mcp.json`) | Modo panel |
| Codex | `.codex-plugin/plugin.json` | No | Modo directo |
| Antigravity | `.antigravity-plugin/plugin.json` | No | Modo directo |
| DeepSeek Harness | `package.json` (`dsh.bundle`) + `cordis.patch.yml` | No | Modo directo |

En **modo directo**, el propio agente hace el trabajo: busca en la web con fuentes, lee y crea el Excel o el Word dentro del proyecto, escribe el código y responde corto y en español. La tabla de equivalencias está en `skills/research-academy/references/modo-directo.md`. Claude Code también usa el modo directo, porque tampoco dibuja el panel.

## Instalar

Con el script (macOS, Linux o Git Bash en Windows):

```sh
curl -fsSL https://raw.githubusercontent.com/davrv93/claude-research/main/instalar.sh | sh -s -- <codex|cursor|antigravity|dsh>
```

O a mano:

### Codex

```sh
codex plugin marketplace add davrv93/claude-research
```

Abre Codex, escribe `/plugins`, elige el marketplace **Research Academy** e instala el plugin. Para actualizar: `codex plugin marketplace upgrade`.

### Cursor

1. Descarga el repositorio y copia la carpeta `plugins/research-academy` en `~/.cursor/plugins/local/research-academy`. Tiene que ser una copia: Cursor no carga enlaces simbólicos que apunten fuera de esa carpeta.
2. Ejecuta **Developer: Reload Window**.
3. En **Customize**, revisa que estén las tres skills y el MCP `research-academy-panel`. Si el MCP viene apagado, enciéndelo.

En un equipo con plan Teams, el administrador puede importar el repositorio como marketplace de equipo (**Dashboard > Plugins & MCPs > Import from Repo**). Se lee `.cursor-plugin/marketplace.json`.

### Antigravity

```sh
git clone https://github.com/davrv93/claude-research
agy plugin install ./claude-research/plugins/research-academy
agy plugin list
```

Sin la CLI `agy`, copia la carpeta en `~/.gemini/config/plugins/research-academy` (para todos los proyectos) o en `.agents/plugins/research-academy` (solo para ese proyecto) y reinicia Antigravity. Las skills también se piden a mano con `/research-academy`, `/plan-trabajo` o `/plantillas-carrera`.

### DeepSeek Harness

```sh
dsh plugin --profile web add "github:davrv93/claude-research#main&path:/plugins/research-academy"
```

Después reinicia dsh. Para la terminal, cambia `web` por `tui`; para `dsh headless`, por `headless`. El bundle registra sus skills como un proveedor aparte, `research-academy`, y no toca `~/.agents/skills` ni las skills del proyecto. Para quitarlo: `dsh plugin --profile web remove dsh-research-academy`.

En el aula del LMS, dsh lee `/trabajo/.agents/skills`. Copiar ahí las tres carpetas de `skills/` funciona igual y no necesita pnpm.

## Probar

En cualquiera de los clientes, en una conversación nueva:

```
research-academy investiga: cual es el sueldo minimo vigente en Peru
```

- En Claude o Cursor debe abrirse el panel.
- En Codex, Antigravity o dsh debe salir una respuesta corta con 3 a 5 fuentes enlazadas y el pie `Consumo: directo · web · agente: ver su medidor`.

## Para el instructor: publicar una versión

1. Cambia `version` en los cinco manifiestos: `.claude-plugin`, `.codex-plugin`, `.cursor-plugin`, `.antigravity-plugin` y `package.json`. Cambia también la del encabezado de `skills/research-academy/SKILL.md`.
2. `node scripts/verificar-plugins.mjs` comprueba que el JSON sea válido, que las versiones coincidan y que las descripciones de las skills estén entre comillas. dsh descarta en silencio una skill cuya `description` lleve «: » sin comillas.
3. Haz commit y push a `main`. Codex lo toma con `codex plugin marketplace upgrade`, dsh al reinstalar el bundle y Cursor y Antigravity al volver a copiar la carpeta.
