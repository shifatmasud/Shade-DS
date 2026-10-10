---
name: "remote-mcp-host"
description: |
  Remote Model Context Protocol (MCP) server integration for connecting xAI Grok Connectors and external MCP clients to control, inspect, and execute workspace tasks inside the AI Studio container.
  
  Use this skill in the following scenarios:
  * Grok Connector Setup: Configuring remote MCP server endpoints (/mcp, /mcp/sse, /mcp/messages) in Grok or other external agent frontends.
  * Remote Workspace Control: Exposing tools for terminal command execution, file reading, file editing, directory inspection, and container health checks.
  * Protocol Verification: Testing and debugging dual-transport MCP (Streamable HTTP POST and Server-Sent Events).
---

# Grok MCP Connector & Remote Workspace Server

This skill details how to connect xAI Grok (and other remote MCP clients) to this AI Studio project using the built-in remote Model Context Protocol (MCP) server.

---

# 1. Architecture & Protocol Transports

The AI Studio Express server (`server.ts`) runs on port 3000 and exposes dual-transport MCP endpoints accessible via the public Cloud Run ingress URL (`https://ais-dev-soqmv42o6nqrg73vgevra3-22244230581.asia-east1.run.app` or `http://localhost:3000` locally):

| Endpoint | Method | Transport Type | Purpose |
| :--- | :--- | :--- | :--- |
| `/mcp` | GET | HTTP (HTML/JSON) | Metadata discovery, connector connection guide, and tool list catalog. |
| `/mcp` | POST | HTTP (JSON-RPC 2.0) | Stateless streamable JSON-RPC endpoint supporting `initialize`, `tools/list`, `tools/call`, `ping`. |
| `/mcp/sse` | GET | Server-Sent Events | Standard MCP SSE stream transport for real-time bi-directional streaming. |
| `/mcp/messages` | POST | HTTP JSON-RPC 2.0 | Session message ingestion endpoint routed to active SSE clients via `sessionId`. |

---

# 2. Connecting to Grok as a Custom Connector

The project is backed by a **Permanent Custom Domain** running on Cloudflare Edge (`workers.dev` + KV config) under the user's Cloudflare account (`shifatmasud`). This domain **never expires** and requires **zero URL updates** in Grok, even when the container restarts.

| Configuration Field | Permanent Value (Zero Expiration) |
| :--- | :--- |
| **Connector Name** | `AI Studio Project Controller` |
| **Primary Server URL (SSE)** | `https://ai-studio-mcp.shifatmasud.workers.dev/mcp/sse` |
| **Alternative URL (POST)** | `https://ai-studio-mcp.shifatmasud.workers.dev/mcp` |
| **Authentication** | `None` / Empty |

### Step-by-Step Setup in Grok:

1. Open **[grok.com](https://grok.com)** &rarr; **Settings** &rarr; **Connectors / Tools**.
2. Click **Add Custom MCP Server** (or **New Connector**).
3. Paste the permanent URL:
   ```text
   https://ai-studio-mcp.shifatmasud.workers.dev/mcp/sse
   ```
   *(If Grok asks for an HTTP POST endpoint instead, paste `https://ai-studio-mcp.shifatmasud.workers.dev/mcp`)*
4. Set Authentication to **None**.
5. Click **Save & Test Connection**.
6. Grok will connect, perform the handshake, and discover all 8 workspace tools.

---

# 3. Available Remote Workspace Tools

The remote MCP server exposes 8 full-access workspace control tools:

### `workspace_run_command`
* **Description**: Executes any bash shell command inside the project container (e.g. `git status`, `npm run build`, `ls -la`, `cat file`).
* **Parameters**:
  * `command` (string, required): The shell command to run.
  * `cwd` (string, optional): Directory relative to workspace root (defaults to `.`).
  * `timeoutMs` (number, optional): Timeout in milliseconds (default 30,000ms, max 120,000ms).

### `workspace_read_file`
* **Description**: Reads contents of any file in the workspace with line range slice support.
* **Parameters**:
  * `path` (string, required): File path relative to workspace root.
  * `startLine` (number, optional): 1-indexed starting line number.
  * `endLine` (number, optional): 1-indexed ending line number.

### `workspace_write_file`
* **Description**: Creates or completely overwrites a workspace file with text content (creates parent folders automatically).
* **Parameters**:
  * `path` (string, required): Target file path.
  * `content` (string, required): Text content to write.

### `workspace_edit_file`
* **Description**: Replaces target substring occurrences in an existing workspace file.
* **Parameters**:
  * `path` (string, required): File path.
  * `targetContent` (string, required): Exact snippet to replace.
  * `replacementContent` (string, required): Replacement snippet.
  * `replaceAll` (boolean, optional): Whether to replace all occurrences (default `false`).

### `workspace_list_dir`
* **Description**: Lists files and subdirectories with sizes and file count.
* **Parameters**:
  * `path` (string, optional): Directory path (default `.`).
  * `recursive` (boolean, optional): Whether to recurse (default `false`).
  * `maxDepth` (number, optional): Max recursion depth (default `2`).

### `workspace_project_status`
* **Description**: Gathers active git branch, uncommitted modifications, memory usage, Node runtime version, and port health.
* **Parameters**: None.

### `workspace_terminal_input`
* **Description**: Dispatches a command line into the project shell and records to audit logs.
* **Parameters**:
  * `input` (string, required): Command or input line.

### `workspace_inspect_logs`
* **Description**: Reads recent entries from `/tmp/agent_terminal.log`.
* **Parameters**:
  * `lines` (number, optional): Number of recent lines to retrieve (default `50`).

---

# 4. Testing & Verification CLI

You can verify the remote MCP server locally or via terminal at any time using:

```bash
npx tsx plugins/remote-mcp-host/test-remote-mcp.ts
```

This tests:
1. Discovery `GET /mcp`
2. `initialize` handshake
3. `tools/list` introspection
4. `tools/call` for `workspace_project_status`
5. `tools/call` for `workspace_run_command`

---

# 5. Tunnel Lifecycle & Renewal Management

Cloudflare Quick Tunnels (`trycloudflare.com`) are free, ephemeral tunnels that run up to 24 hours per session or until container restarts.

### A. Check Tunnel Status & Active URL
```bash
npm run tunnel:status
```
Or query via HTTP:
```bash
curl http://localhost:3000/api/mcp/tunnel
```

### B. Renew / Regenerate Tunnel in 5 Seconds
When an ephemeral tunnel session expires, renew it instantly:
```bash
npm run tunnel:renew
```
Or via HTTP POST:
```bash
curl -X POST http://localhost:3000/api/mcp/tunnel/renew
```
The script will cleanly stop the stale tunnel, establish a new edge session, and output the fresh URL to paste into Grok.

### C. Permanent Static URL (Zero Expiration)
To prevent the URL from ever changing or expiring, you can use a free Cloudflare Zero Trust Named Tunnel:
1. In the Cloudflare Zero Trust dashboard, create a Tunnel under **Networks** &rarr; **Tunnels**.
2. Copy the Tunnel Token.
3. Add it to your `.env` file:
   ```env
   CLOUDFLARE_TUNNEL_TOKEN="<YOUR_TUNNEL_TOKEN>"
   ```
4. Run `npm run tunnel:renew`.
The tunnel will bind permanently to your custom domain (e.g. `https://mcp.yourdomain.com/mcp/sse`) with zero expiration.
