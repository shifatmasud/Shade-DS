# Tech Spec

1. **Objective**
   - **Problem Statement**: The AI Studio development environment is a headless Linux container lacking interactive desktop browser access, requiring an automated remote MCP connection to Upsy (https://upsy.ai/connect) with OAuth 2.1 PKCE authorization.
   - **Solution Overview**: Build a standalone Node.js CLI tool (`scripts/upsy-cli.ts` executable via `bin/upsy` and `npx tsx`) that performs Dynamic Client Registration (RFC 7591), initiates PKCE S256 OAuth 2.1 authentication via a Cloudflare Quick Tunnel callback URL (`cloudflared tunnel --url http://127.0.0.1:8787`), serves a clean callback verification page, captures the authorization code, exchanges it for access/refresh tokens, persists credentials to `.upsy.json`, and exposes full MCP tool listing and tool execution capabilities over Streamable HTTP.
   - **Scope**:
     - Dynamic OAuth 2.1 registration and PKCE flow.
     - Cloudflare tunnel callback bridge for headless interaction.
     - OAuth state persistence in `.upsy.json` with token refresh logic.
     - MCP streamable HTTP client integration with tool discovery and execution.
     - Accompanying skill documentation at `skills/upsy-cli/SKILL.md`.
   - **Context**: Integrates Upsy remote MCP server providing user memory, files, browser, and 40+ connected service tools.

2. **Success Criteria**
   - **Key Results**:
     - Standalone, portable Node.js CLI tool supporting `auth`, `status`, `tools`, `call`, and `refresh` commands.
     - Working OAuth 2.1 authorization link provided to user with automated code capture via Cloudflare tunnel.
     - Successful token exchange and persistence in `.upsy.json`.
     - Inspection and listing of all available Upsy MCP tools over Streamable HTTP (`https://upsy.ai/connect`).
     - Memory record output confirming tool scope and connector preference.
   - **Non-Negotiables**:
     - Zero disruption to protected components (Dock immunity preserved).
     - No external icon dependencies added.
     - Full headless parity using Cloudflare tunnel.
     - Accompanying `skills/upsy-cli/SKILL.md` included.

3. **Project Requirements**
   - [ ] Build `scripts/upsy-cli.ts` supporting full CLI subcommands (`login`, `status`, `tools`, `call`, `refresh`).
   - [ ] Create wrapper script in `bin/upsy` and verify executable permissions.
   - [ ] Implement PKCE S256 generation, Dynamic Client Registration with Upsy OAuth endpoint (`https://upsy.ai/api/oauth/register`).
   - [ ] Spawn local callback server on port 8787 and establish Cloudflare tunnel (`cloudflared tunnel --url http://127.0.0.1:8787`) to receive redirect.
   - [ ] Output authorization URL for user to click and approve.
   - [ ] Exchange authorization code at `https://upsy.ai/api/oauth/token` and persist credentials in `.upsy.json`.
   - [ ] Connect to `https://upsy.ai/connect` via Streamable HTTP MCP transport to list and call tools.
   - [ ] Author `skills/upsy-cli/SKILL.md` detailing architecture, commands, and MCP schemas.
   - [ ] Formulate and display memory instruction with covered tools.

4. **Architecture Decisions**
   - **Decision 1: Standalone TypeScript CLI with `tsx` & Direct HTTP MCP Client**
     - *Rationale*: Allows portability across any Node.js environment without heavy global binary dependencies. Uses standard `fetch` with Streamable HTTP JSON-RPC 2.0 protocol matching `@modelcontextprotocol/sdk` specs.
     - *Alternatives*: Standard stdio bridge only (rejected because Upsy is a remote HTTP endpoint).
   - **Decision 2: Cloudflare Tunnel for OAuth Callback Capture**
     - *Rationale*: Resolves headless container routing constraints by tunneling the local OAuth callback server (port 8787) through an ephemeral public HTTPS URL (`*.trycloudflare.com`) registered dynamically during client registration.
     - *Alternatives*: Manual auth code copy-paste (supported as seamless automatic fallback if tunnel fails).
   - **Decision 3: Workspace `.upsy.json` Persistence**
     - *Rationale*: Matches confirmed user preference, keeping credentials self-contained within workspace without polluting user root.

5. **Pseudo Code**
   ```shade
   DATA:
     upsyConfig: Record {
       endpoint: "https://upsy.ai/connect",
       authServer: "https://upsy.ai/.well-known/oauth-authorization-server",
       clientId: String,
       accessToken: String?,
       refreshToken: String?,
       scopes: List<String>
     }
     oauthSession: Record {
       verifier: String,
       challenge: String,
       state: String,
       tunnelUrl: String?,
       localPort: 8787
     }

   LOGIC:
     fn discoverEndpoints() -> OAuthMetadata
     fn registerClient(redirectUri) -> ClientCredentials
     fn startCloudflareTunnel(port) -> PublicUrl
     fn generatePKCE() -> { verifier, challenge }
     fn listenForCallback(codeVerifier, state) -> AuthCode
     fn exchangeToken(code, codeVerifier, redirectUri) -> TokenResponse
     fn queryMcpTools(token) -> List<McpTool>
     fn executeMcpTool(token, name, arguments) -> ToolResult

   RENDER:
     CLI Streamable Output {
       Display auth url with Cloudflare link
       Display live status spinner & token capture confirmation
       Display table of discovered tools & categories
       Output memory prompt summary
     }
   ```
