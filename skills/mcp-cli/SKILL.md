---
name: "mcp-cli"
description: |
  Connect to, discover, and execute tools on any Model Context Protocol (MCP) server. Supports Stdio, HTTP, SSE, and custom MCP server transports.
  
  Use this skill in the following scenarios:
  * MCP Integration: Connecting AI Studio as an MCP client to external or local MCP servers (e.g., Figma, GitHub, Postgres, Custom APIs).
  * MCP Transport Setup: Configuring Stdio process streams or HTTP/SSE network endpoints with authentication headers.
  * Tool Orchestration: Querying available tool definitions, schemas, and executing JSON-RPC 2.0 tool calls non-interactively.
---

# MCP CLI & Client Skill

This skill provides guidelines and executable utilities for acting as a Model Context Protocol (MCP) client in AI Studio. It enables seamless connection to local and remote MCP servers via Stdio or HTTP/SSE transports.

---

## 1. Universal MCP Client Architecture

AI Studio includes a built-in TypeScript MCP client (`/scripts/mcp-client.ts`) powered by the official `@modelcontextprotocol/sdk`.

### Features
* **Multi-Transport Support**: Connects via Stdio processes (`child_process`) or HTTP/SSE streams.
* **Header & Auth Proxying**: Automatically injects API keys and Bearer / Custom tokens (e.g., `X-Figma-Token`, `Authorization`).
* **Tool Discovery**: Introspects server capabilities and JSON schemas via `ListToolsRequestSchema`.
* **RPC Execution**: Calls tools safely with structured parameter validation and JSON-RPC 2.0 error handling.

---

## 2. Server Configuration Format

MCP server configurations use standard JSON schemas:

```json
{
  "servers": {
    "figma": {
      "url": "https://mcp.figma.com/mcp",
      "type": "http"
    },
    "local_figma": {
      "type": "stdio",
      "command": "npx",
      "args": ["tsx", "scripts/figma-mcp-server.ts"]
    }
  }
}
```

---

## 3. CLI Commands

Use `scripts/mcp-client.ts` to inspect and execute tools on configured MCP servers:

### A. List Tools & Run Sanity Test
```bash
npx tsx scripts/mcp-client.ts test
```

### B. Execute a Specific MCP Tool
```bash
npx tsx scripts/mcp-client.ts call <tool_name> '<json_arguments>'
```

Example:
```bash
npx tsx scripts/mcp-client.ts call figma_get_me '{}'
```

---

## 4. Programmatic Client Usage in TypeScript

You can import `UniversalMCPClient` into any server script or tool:

```typescript
import { UniversalMCPClient } from "./scripts/mcp-client.js";

async function run() {
  const client = new UniversalMCPClient("my-app-agent", "1.0.0");
  
  // 1. Connect over Stdio to local script
  await client.connectToStdio("npx", ["tsx", "scripts/figma-mcp-server.ts"]);

  // 2. Query tools
  const { tools } = await client.listTools();
  console.log("Available tools:", tools.map(t => t.name));

  // 3. Execute tool call
  const result = await client.callTool("figma_get_me", {});
  console.log("Result:", result);

  await client.close();
}

run();
```

---

## 5. Connecting Remote HTTP / SSE Servers

When connecting to remote servers (like `https://mcp.figma.com/mcp`):
1. **Pass Auth Headers**: Pass environment variables like `X-Figma-Token` or `Authorization: Bearer <TOKEN>`.
2. **Fallback to Stdio Proxy**: If a remote server requires OAuth browser redirection, use a local Stdio proxy script (`scripts/figma-mcp-server.ts`) that handles API authentication under the hood using your API token.

---

## 6. Creating Custom MCP Servers

To create a new MCP server for a service:
1. Initialize `@modelcontextprotocol/sdk/server/index.js`.
2. Define tool schemas in `ListToolsRequestSchema`.
3. Handle execution in `CallToolRequestSchema`.
4. Connect via `StdioServerTransport` and test via `UniversalMCPClient`.
