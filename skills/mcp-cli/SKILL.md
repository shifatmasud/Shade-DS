---
name: "mcp-cli"
description: |
  Connect to, discover, and execute tools on any Model Context Protocol (MCP) server. Supports Stdio, HTTP, SSE, and custom MCP server transports with OAuth support.
  
Use this skill in the following scenarios:
  * MCP Integration: Connecting AI Studio as an MCP client to external or local MCP servers (e.g., Figma, GitHub, Postgres, Raylight, Upsy).
  * MCP Transport Setup: Configuring Stdio process streams or HTTP/SSE network endpoints with authentication headers.
  * OAuth for MCP: Implementing popup-based OAuth flows for remote MCP servers that require authentication.
  * Tool Orchestration: Querying available tool definitions, schemas, and executing JSON-RPC 2.0 tool calls non-interactively.
---

# MCP CLI & Client Skill

This skill provides guidelines and executable utilities for acting as a Model Context Protocol (MCP) client in AI Studio. It enables seamless connection to local and remote MCP servers via Stdio or HTTP/SSE transports.

---

## 1. Universal MCP Client Architecture

AI Studio includes a built-in TypeScript MCP client (`/scripts/mcp-client.ts`) powered by the official `@modelcontextprotocol/sdk`.

### Features
* **Multi-Transport Support**: Connects via Stdio processes (`child_process`) or HTTP/SSE streams.
* **Header & Auth Proxying**: Automatically injects API keys and Bearer / Custom tokens.
* **Dynamic Configuration**: Loads server definitions from `mcp-config.json`.
* **Tool Discovery**: Introspects server capabilities and JSON schemas via `ListToolsRequestSchema`.
* **RPC Execution**: Calls tools safely with structured parameter validation and JSON-RPC 2.0 error handling.

---

## 2. Server Configuration Format (`mcp-config.json`)

MCP server configurations use standard JSON schemas:

```json
{
  "servers": {
    "raylight": {
      "url": "https://api.raylight.app/mcp",
      "type": "sse",
      "headers": {
        "Authorization": "Bearer <TOKEN>"
      }
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
npx tsx scripts/mcp-client.ts test <server_name>
```

### B. Execute a Specific MCP Tool
```bash
npx tsx scripts/mcp-client.ts call <server_name> <tool_name> '<json_arguments>'
```

Example:
```bash
npx tsx scripts/mcp-client.ts call raylight list_scenes '{}'
```

---

## 4. Third-Party OAuth for MCP

Remote MCP servers (like Raylight or Upsy) often require OAuth.

1.  **Initiate Auth**: Create a backend route that redirects to the provider's authorize endpoint.
2.  **Callback**: Handle the code exchange and store the `access_token` in `tokens.json`.
3.  **Config Sync**: Automatically update `mcp-config.json` with the new Bearer token in the `headers` object.
4.  **Client Usage**: The `UniversalMCPClient` will automatically use these headers in subsequent connections.

---

## 5. Programmatic Client Usage in TypeScript

```typescript
import { UniversalMCPClient } from "./scripts/mcp-client.js";

async function run() {
  const client = new UniversalMCPClient("my-app-agent", "1.0.0");
  
  // Connect to a configured server from mcp-config.json
  await client.connectToHTTP("https://api.raylight.app/mcp", {
    "Authorization": "Bearer YOUR_ACCESS_TOKEN"
  });

  const { tools } = await client.listTools();
  console.log("Available tools:", tools.map(t => t.name));

  await client.close();
}

run();
```
