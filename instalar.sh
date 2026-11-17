#!/bin/sh
# Instala el plugin Research Academy en Codex, Cursor, Antigravity o DeepSeek Harness.
# Uso:  sh instalar.sh <codex|cursor|antigravity|dsh> [perfil-dsh]
# Sin clonar:  curl -fsSL https://raw.githubusercontent.com/davrv93/claude-research/main/instalar.sh | sh -s -- cursor
set -eu

REPO="davrv93/claude-research"
RAMA="${RAMA:-main}"
DESTINO="${1:-}"

traer_plugin() {
  # Deja en $PLUGIN una copia limpia de plugins/research-academy.
  # ORIGEN=/ruta/al/repo usa una copia local en vez de clonar (para probar).
  if [ -n "${ORIGEN:-}" ]; then PLUGIN="$ORIGEN/plugins/research-academy"; return; fi
  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT
  git clone --quiet --depth 1 --branch "$RAMA" "https://github.com/$REPO.git" "$TMP/repo"
  PLUGIN="$TMP/repo/plugins/research-academy"
}

copiar_en() {
  # Copia (no enlaza: Cursor ignora symlinks que salen de su carpeta).
  mkdir -p "$(dirname "$1")"
  rm -rf "$1"
  cp -R "$PLUGIN" "$1"
  echo "Copiado en $1"
}

case "$DESTINO" in
  codex)
    command -v codex >/dev/null || { echo "No encuentro el comando codex. Instala Codex primero." >&2; exit 1; }
    codex plugin marketplace add "$REPO" --ref "$RAMA"
    echo "Listo. Abre Codex, escribe /plugins, elige «Research Academy» e instala el plugin."
    ;;
  cursor)
    traer_plugin
    copiar_en "$HOME/.cursor/plugins/local/research-academy"
    echo "Listo. En Cursor: Developer: Reload Window y revisa Customize > Plugins."
    echo "El panel research-academy-panel aparece en Customize > MCPs; actívalo si viene apagado."
    ;;
  antigravity)
    traer_plugin
    if command -v agy >/dev/null; then
      agy plugin install "$PLUGIN"
      agy plugin list
    else
      copiar_en "$HOME/.gemini/config/plugins/research-academy"
      echo "Reinicia Antigravity y revisa Customizations > Installed."
    fi
    ;;
  dsh)
    PERFIL="${2:-web}"
    command -v dsh >/dev/null || { echo "No encuentro dsh. Instálalo: npm i -g @deepseek-ai/dsh@next" >&2; exit 1; }
    dsh plugin --profile "$PERFIL" add "github:$REPO#$RAMA&path:/plugins/research-academy"
    echo "Listo. Reinicia dsh (dsh --profile $PERFIL) y abre una sesión nueva."
    ;;
  *)
    echo "Uso: sh instalar.sh <codex|cursor|antigravity|dsh> [perfil-dsh]" >&2
    exit 2
    ;;
esac
