# Instalacion desde el marketplace del taller

1. Abre https://claude.ai/customize/plugins.
2. Selecciona **Agregar > Agregar marketplace > Desde repositorio** y pega `davrv93/claude-research`.
3. Instala y habilita **Research Academy**. El plugin trae un solo conector: el panel `https://jmd-learn.online/research-academy/mcp`.
4. Si usas **Claude Desktop**, puedes instalar en su lugar la extension local `dist/research-academy-panel-<version>.mcpb` (doble clic). Funciona sin servidor.
5. **Desconecta** los conectores Parallel y OpenRouter si los tenias: sus esquemas entran al contexto de Claude en cada turno (unos 9 000 tokens solo Parallel) y el panel ya hace su trabajo.
6. Primera vez que el panel aparezca: boton "Abrir OpenRouter", autorizar con una cuenta gratuita, pegar el codigo que OpenRouter muestra, Guardar. La llave queda solo en tu navegador. Nunca pegues una llave API en el chat.
7. Comprueba: `research-academy investiga: cual es el sueldo minimo vigente en Peru`. Debe aparecer el panel con fuentes y el medidor de tokens.

Si el panel no se muestra, Claude lo dice y responde directo. El servidor del panel no guarda llaves ni llama a modelos; solo entrega la interfaz.
