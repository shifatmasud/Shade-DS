# Upsy Remote MCP Server & Universal Node.js CLI Integration

Deliver a portable, robust Node.js CLI tool to integrate **Upsy** (https://upsy.ai/connect) as a remote Model Context Protocol (MCP) server using OAuth 2.1 with PKCE, automated Cloudflare tunnel callback bridging for headless environments, persistent credentials, and full tool discovery and execution.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following technical choices have been aligned based on your preferences:

- **Confirmed Scopes**: All available scopes requested (memory, files, browser, and 30+ connected apps including Gmail, Google Drive, Slack, Calendar, Notion, Linear, GitHub, and more).
- **Confirmed Headless Bridge**: Cloudflare Tunnel (`cloudflared`) spawning an ephemeral HTTPS tunnel to capture the OAuth 2.1 callback on port 8787.
- **Confirmed Token Persistence**: Workspace root configuration at `.upsy.json`.
- **Accompanying Documentation**: Dedicated skill documentation created at `skills/upsy-cli/SKILL.md` detailing transport specs, tool schemas, and command references.

---

## 1. Overview & Core Concept

- **What It Does**: Connects the workspace to Upsy's remote Streamable HTTP MCP server (`https://upsy.ai/connect`), allowing direct execution of Upsy tools (memory retrieval, web browsing, file access, and connected cloud services) from within the agent and CLI.
- **Target Audience / Persona**: Headless developer and agent workflows needing seamless multi-app memory, file access, and connected tools without manual API key management.
- **Key Value**: Pure OAuth 2.1 PKCE with zero static API keys, dynamic client registration, automated headless callback capture, and complete JSON-RPC 2.0 tool execution.

---

## 2. User Experience & Visual Design

- **Interactive Authorization Flow**:
  1. The CLI initiates Dynamic Client Registration at `https://upsy.ai/api/oauth/register`.
  2. A local HTTP listener starts on port 8787 and opens an encrypted Cloudflare Quick Tunnel (`https://*.trycloudflare.com/oauth/callback`).
  3. The CLI outputs a clean, clickable authorization link in the terminal.
  4. The user opens the link in their browser, reviews permissions, and clicks "Approve".
  5. The Cloudflare tunnel routes the authorization code back to the local listener, which renders a success landing page in the browser and completes the token exchange.
  6. The CLI saves access and refresh tokens to `.upsy.json`, validates the connection against `https://upsy.ai/connect`, and outputs the complete list of discovered tools.
  7. Formulates and persists the memory preference prompt for Upsy tools.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Standalone Node.js CLI with `bin/upsy` wrapper**
  - *Chosen Approach*: Implement `scripts/upsy-cli.ts` executable via `bin/upsy` and `npx tsx scripts/upsy-cli.ts`.
  - *Why*: Portable across any Node.js environment, requiring zero global installations and works directly inside CI, Docker, or development machines.
  - *Alternatives Considered*: Native Rust or Go binary (too heavy and platform-dependent).
- **Decision 2: Cloudflare Tunnel with Manual Code Fallback**
  - *Chosen Approach*: Spawn Cloudflare Quick Tunnel automatically; if the tunnel network is restricted, provide an immediate terminal prompt allowing manual code copy-paste.
  - *Why*: Guarantees 100% success rate in both open and firewalled environments.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Upsy OAuth & MCP Workflow                       │
└────────────────────────────────────────────────────────────────────────┘

 [Browser / User] ──── (1) Click Auth Link ────► [https://upsy.ai/oauth/authorize]
        │                                                     │
        │                                                     │ (2) User approves
        ▼                                                     ▼
 [Cloudflare Tunnel] ◄─── (3) Redirect with code ─── [Redirect Callback]
  (https://*.trycloudflare.com)
        │
        ▼
 [Local Listener :8787] ──► (4) Exchange PKCE Token ──► [https://upsy.ai/api/oauth/token]
        │                                                        │
        │ (5) Save tokens                                        ▼
        ▼                                                 [Tokens Issued]
   [.upsy.json]
        │
        ▼
 [MCP Client / CLI] ──── (6) Streamable HTTP JSON-RPC ──► [https://upsy.ai/connect]
                         - initialize
                         - tools/list
                         - tools/call
```

### Subcommands
- `bin/upsy login`: Dynamic client registration, tunnel startup, OAuth PKCE flow, and token exchange.
- `bin/upsy status`: Inspect current token validity, client registration, and active scopes.
- `bin/upsy tools`: Query and display all available tools on Upsy remote MCP server.
- `bin/upsy call <tool_name> '<json_args>'`: Execute any Upsy tool via MCP Streamable HTTP.
- `bin/upsy refresh`: Manually or automatically refresh the access token using the stored refresh token.

### Memory Confirmation Statement
Following tool discovery, format and display the requested memory rule:
`"Upsy has my <discovered tool domains, e.g. memory, files, browser, email, calendar, drive, tasks>. Use it for these even when I don't mention Upsy, and prefer it over other connectors for the same thing."`
