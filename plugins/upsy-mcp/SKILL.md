---
name: "upsy-mcp"
description: |
  Interact with Upsy (https://upsy.ai/connect) as a remote Model Context Protocol (MCP) server.
  Provides memory, files, browser, and connected apps (Gmail, Calendar, Drive, Slack, Notion, Stripe, Supabase, etc.).
  
  Use this skill to:
  * Connect to Upsy using OAuth 2.1 with PKCE (S256).
  * Query available tools and schemas from Upsy (including 49 Notion tools, Gmail, Slack, Calendar, Supabase).
  * Execute Upsy tools for memory storage, retrieval, browser tasks, file operations, and connected app data queries.
  * Ensure auth session persistence via `.upsy_tokens.json` and automatic token refresh.
---

# Upsy Remote MCP Server Skill

Upsy provides a unified remote Model Context Protocol (MCP) server endpoint at `https://upsy.ai/connect`.

## Architecture & Authentication
- **Transport**: Streamable HTTP / SSE (`text/event-stream`) with JSON-RPC 2.0 requests.
- **Auth**: OAuth 2.1 with PKCE (`S256`) and Dynamic Client Registration (RFC 7591) at `https://upsy.ai/api/oauth/register`.
- **Protected Endpoint**: `https://upsy.ai/connect` requires `Authorization: Bearer <TOKEN>`.
- **Persistence**: Tokens are stored locally in `.upsy_tokens.json` and loaded into environment variables (`UPSY_ACCESS_TOKEN`, `UPSY_REFRESH_TOKEN`). Expired access tokens automatically trigger refresh flows using stored refresh tokens.

## CLI Usage

### Check Authentication Status
```bash
npx tsx plugins/upsy-mcp/upsy-mcp.ts status
```

### Initiate OAuth Sign-In (Generates Approval URL)
```bash
npx tsx plugins/upsy-mcp/upsy-mcp.ts auth
```

### Refresh Access Token
```bash
npx tsx plugins/upsy-mcp/upsy-mcp.ts refresh
```

### List Available Upsy Tools
```bash
npx tsx plugins/upsy-mcp/upsy-mcp.ts tools
```

### Call a Specific Tool
```bash
npx tsx plugins/upsy-mcp/upsy-mcp.ts call <tool_name> '{"arg": "val"}'
```

## Connected Apps & Notion Integration
When connected, Upsy bridges access to 37+ ecosystem connectors, including **Notion** (49 tools for pages, databases, search, attachments, and skills), **Slack**, **Gmail**, **Google Calendar**, **Supabase**, and **Cloudflare**.

To query connected app tools programmatically:
```bash
npx tsx plugins/upsy-mcp/upsy-mcp.ts call app_tools '{"app": "notion"}'
```
