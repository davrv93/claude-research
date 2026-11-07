// Entrada para Claude Desktop (extension .mcpb): mismo servidor por stdio.
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { buildServer } from './mcp.mjs';

const server = buildServer();
await server.connect(new StdioServerTransport());
