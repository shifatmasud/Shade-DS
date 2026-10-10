# Remote MCP Server for Grok Connectors

Expose a dual-transport Remote Model Context Protocol (MCP) server on the Express backend (`/mcp` and `/mcp/sse`) allowing xAI Grok Connectors and external AI agents to remotely inspect, operate, and control this AI Studio project workspace.

## User Review & Critical Decisions

> [!IMPORTANT]
> Based on your answers to the clarification questions, the following architecture decisions are confirmed:
> - **Workspace Control Scope**: Full control enabled (bash terminal command execution, file read/write/replace, directory listing, project status, and terminal logs).
> - **Authentication Mode**: Open access endpoint (no authentication required) for direct plug-and-play connection with Grok Connectors.
> - **Supported Transports**: Dual transport supported: both Streamable HTTP POST JSON-RPC 2.0 at `/mcp` and Server-Sent Events (SSE) at `/mcp/sse` + `/mcp/messages`.
> - **UI Component Immunity**: Adhering strictly to project rules, no modifications will be made to `/components/Section/Dock.tsx` or `/components` without separate permission.

## 1. Overview & Core Concept

- **What It Does**: Provides a standards-compliant Model Context Protocol (MCP) server running inside the live AI Studio Express application container. External AI assistants (like Grok on grok.com) can register this endpoint as a custom Connector to interactively run terminal commands, review and edit code, verify build statuses, and inspect workspace state.
- **Target Audience / Persona**: Developers using Grok (or any MCP-compatible agent) who want external AI models to remotely inspect and modify this AI Studio project in real-time.
- **Key Value**: Bridges external AI assistants directly to the cloud development container with zero client setup friction and native support for both modern SSE streaming and HTTP POST protocols.

## 2. User Experience & Visual Design

- **Grok Connector Setup Flow**:
  1. User opens Grok (`grok.com`) -> Settings -> Connectors / MCP Tools.
  2. User enters the App's public URL: `https://ais-dev-soqmv42o6nqrg73vgevra3-22244230581.asia-east1.run.app/mcp/sse` (or `/mcp`).
  3. Grok connects, executes the `initialize` handshake, and discovers all 8 workspace tools.
  4. Grok can now invoke actions such as *"Run npm run lint"*, *"Check git status"*, or *"Read package.json"*.
- **Endpoint Inspection & Discovery**:
  - Accessing `GET /mcp` in the browser or via curl returns a clean JSON summary of the MCP server status, active transports, connector setup URLs, and the full catalog of available tools.
- **Interactive Feedback & Diagnostics**:
  - Live logging in the server console and `/tmp/agent_terminal.log` records every tool invocation, arguments, and execution duration.

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dual-Transport Support (SSE + Direct HTTP POST)**:
  - *Chosen Approach*: Implement both `SSEServerTransport` (for streaming clients expecting `GET /mcp/sse` + `POST /mcp/messages?sessionId=...`) and direct stateless JSON-RPC 2.0 POST handling at `/mcp`.
  - *Why*: Grok Connectors and various MCP clients have differing transport expectations; dual-transport guarantees full compatibility without needing proxy adapters.
  - *Alternatives Considered*: SSE-only would break HTTP-only JSON-RPC callers; POST-only would fail for clients requiring persistent SSE event channels.

- **Decision 2: Tool Sandboxing & Execution Safety**:
  - *Chosen Approach*: Execute commands in the workspace root with standard timeouts (30s default, configurable up to 120s) and resolve all file paths safely relative to `process.cwd()`.
  - *Why*: Prevents infinite-hang processes from blocking the Node.js event loop while granting unrestricted operational agility to the connecting assistant.

- **Decision 3: Dedicated Service Architecture**:
  - *Chosen Approach*: Separate tool definitions and execution into `services/remoteMcpServer.ts`, keeping `server.ts` clean with concise route handlers.
  - *Why*: High cohesion, testable with local scripts (`scripts/test-remote-mcp.ts`), and maintains clean architecture.

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│               External AI Client (Grok)                │
└──────────────────────────┬─────────────────────────────┘
                           │ (HTTP POST / SSE)
                           ▼
┌────────────────────────────────────────────────────────┐
│             AI Studio Express Server (3000)            │
│  GET  /mcp          -> Metadata & Diagnostic Discovery │
│  POST /mcp          -> Stateless JSON-RPC 2.0 Handler  │
│  GET  /mcp/sse      -> Server-Sent Events Stream       │
│  POST /mcp/messages -> SSE Session RPC Ingestion       │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│             services/remoteMcpServer.ts                │
│  • Tool Registry (8 Workspace Tools)                   │
│  • Schema Definitions (JSON Schema compliant)          │
│  • Handshake & Protocol Dispatcher                     │
└──────────────────────────┬─────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│ Bash Shell PTY │ │  File System   │ │ System & Git   │
│ & Terminal Bus │ │ (Read/Write)   │ │ Info Collector │
└────────────────┘ └────────────────┘ └────────────────┘
```

### Exposed MCP Tools

1. `workspace_run_command`: Executes any shell command in the project (bash, git, npm, curl, etc.) with timeout protection.
2. `workspace_read_file`: Reads text files with line range slicing support.
3. `workspace_write_file`: Writes or creates files (with recursive directory creation).
4. `workspace_edit_file`: Performs exact string replacements in existing files.
5. `workspace_list_dir`: Lists directory contents, files, and sizes.
6. `workspace_project_status`: Returns current git branch, status, running processes, Node version, and port health.
7. `workspace_terminal_input`: Injects commands or keystrokes into the active interactive PTY session.
8. `workspace_inspect_logs`: Retrieves recent agent terminal audit logs.

### Accompanying Skill & Verification

- `/skills/grok-mcp-connector/SKILL.md`: Companion skill documenting how to configure Grok Connectors and test the endpoints.
- `scripts/test-remote-mcp.ts`: Self-contained script to test both HTTP POST and SSE transports locally.
