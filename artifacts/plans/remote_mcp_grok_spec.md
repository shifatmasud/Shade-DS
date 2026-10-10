# Tech Spec 

1. **Objective**
   - **Problem Statement**: Grok and external AI assistants need a standardized, remote Model Context Protocol (MCP) interface to directly connect to, inspect, and control this Google AI Studio project workspace in real-time.
   - **Solution Overview**: Expose a dual-transport Remote MCP Server directly on the Express server (`/mcp` and `/mcp/sse`) supporting both Server-Sent Events (SSE) and stateless HTTP POST JSON-RPC 2.0. Expose full workspace control capabilities: terminal execution, file reading/writing/editing, directory traversal, git/system status, and audit inspection.
   - **Scope**: Express server routes in `server.ts`, dedicated MCP service layer in `services/remoteMcpServer.ts`, CLI verification test in `scripts/test-remote-mcp.ts`, and accompanying agent skill documentation at `/skills/grok-mcp-connector/SKILL.md`. Does not modify protected Dock or UI components without explicit permission.
   - **Context**: AI Studio runs Express on port 3000 with public ingress via Google Cloud Run (`https://ais-dev-...run.app`). Grok Connectors can connect to public HTTPS endpoints supporting MCP specs.

2. **Success Criteria**
   - **Key Results**:
     - Remote MCP endpoint accessible at `/mcp` (GET info + POST JSON-RPC) and `/mcp/sse` + `/mcp/messages` (SSE stream).
     - Full tool suite operational: `workspace_run_command`, `workspace_read_file`, `workspace_write_file`, `workspace_edit_file`, `workspace_list_dir`, `workspace_project_status`, `workspace_terminal_input`, `workspace_inspect_logs`.
     - Zero authentication required (open access) as confirmed by the user.
     - Compatible with official `@modelcontextprotocol/sdk` clients and Grok Connectors.
   - **Non-Negotiables**:
     - Strict error handling preventing server crash on command or file execution errors.
     - Path traversal safety checks anchored to workspace root (`process.cwd()`).
     - No modifications to `/components/Section/Dock.tsx` or protected UI components.
     - Accurate SKILL.md documentation created for tool discovery.

3. **Project Requirements**
   - [ ] Implement `services/remoteMcpServer.ts` encapsulating MCP tool schemas and execution logic.
   - [ ] Wire `/mcp` (POST JSON-RPC & GET Discovery/Status) in `server.ts`.
   - [ ] Wire `/mcp/sse` and `/mcp/messages` (SSEServerTransport) in `server.ts`.
   - [ ] Build end-to-end verification script `scripts/test-remote-mcp.ts` validating tool discovery and execution.
   - [ ] Create `/skills/grok-mcp-connector/SKILL.md` detailing setup steps, URL copy-paste instructions for Grok, and tool definitions.
   - [ ] Verify build and TypeScript compilation (`npm run build`).

4. **Architecture Decisions**
   - **Dual-Transport Architecture**:
     - *Trade-off*: Maintaining both SSE session maps and stateless POST JSON-RPC handlers increases route handling logic.
     - *Benefit*: Provides 100% interoperability with all MCP client variants: Grok Connectors (which prefer SSE or HTTP POST), Claude desktop, CLI clients, and standard curl/fetch probes.
     - *Alternative*: SSE-only would fail for lightweight HTTP POST callers; POST-only would fail for long-running streaming subscribers.
   - **Direct Express Mounting vs. Subprocess**:
     - *Trade-off*: Mounting directly in `server.ts` shares the main Node process.
     - *Benefit*: Has direct memory and event access to the active PTY shell clients, broadcast buses, and terminal state without IPC overhead.

5. **Pseudo Code**
```shade
DATA:
  state remoteMcpConfig {
    endpointPath: "/mcp"
    ssePath: "/mcp/sse"
    authRequired: false
    workspaceRoot: process.cwd()
  }

  type McpToolDefinition {
    name: string
    description: string
    parameters: JSONSchema
  }

LOGIC:
  fn handleMcpPost(req, res):
    body = req.body
    if body.method == "tools/list":
      return jsonRpcResult(toolsList)
    if body.method == "tools/call":
      result = executeWorkspaceTool(body.params.name, body.params.arguments)
      return jsonRpcResult(result)
    if body.method == "initialize":
      return jsonRpcResult(serverCapabilities)

  fn handleMcpSse(req, res):
    transport = new SSEServerTransport("/mcp/messages", res)
    server.connect(transport)

RENDER:
  expose GET /mcp -> returns HTML/JSON connector diagnostic dashboard with Grok connection URLs
  expose GET /mcp/sse -> Server-Sent Events stream
  expose POST /mcp/messages -> SSE session RPC handler
  expose POST /mcp -> Stateless JSON-RPC 2.0 handler
```
