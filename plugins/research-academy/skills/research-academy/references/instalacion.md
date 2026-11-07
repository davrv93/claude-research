# Instalacion desde el marketplace del taller

1. Abre https://claude.ai/customize/plugins.
2. En Claude Pro selecciona **Agregar > Agregar marketplace > Desde repositorio**.
3. Pega `davrv93/claude-research` (o https://github.com/davrv93/claude-research).
4. Instala y habilita **Research Academy**.
5. Revisa los conectores. Si no se configuran automaticamente, usa Personalizar > Conectores para agregarlos individualmente:
   - Parallel: https://mcp.parallel.ai/mcp (funciones gratuitas sin cuenta con limites de uso)
   - OpenRouter: https://mcp.openrouter.ai/mcp (OAuth individual; `send-message` es una llamada de inferencia, elegir solo modelos realmente gratuitos)
6. Nunca introduzcas claves API en el chat. El tope de gasto de OpenRouter no es saldo gratuito.
7. Para comprobar: pide una busqueda muy breve con fuentes y despues un Artifact sencillo.

No confundir instalacion de plugin con autorizacion efectiva de MCP. Los limites gratuitos pueden cambiar. Claude Pro sigue consumiendo su cuota durante las llamadas.
