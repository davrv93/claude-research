// Transporte stdio, para Claude Desktop (extensión .mcpb o mcpServers en la configuración).
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { buildServer } from './mcp.mjs';

await buildServer().connect(new StdioServerTransport());
