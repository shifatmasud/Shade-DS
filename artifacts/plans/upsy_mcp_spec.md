# Tech Spec: Upsy Remote MCP Server & OAuth 2.1 PKCE Integration

1. **Objective**
   - Integrate Upsy (https://upsy.ai/connect) as a remote Model Context Protocol (MCP) server.
   - Implement OAuth 2.1 with PKCE client authentication utilizing Dynamic Client Registration (RFC 7591) and the Upsy OAuth authorization server (RFC 8414).
   - Provide an automated OAuth dance initiation mechanism with a generated interactive approval URL/button for the user.
   - Support token exchange with S256 code challenge/verifier and token persistence in the container environment.
   - Connect to Upsy MCP endpoints over Streamable HTTP/SSE, introspect all capabilities/tools, and enable seamless execution.
   - Provide user-facing UI in the prototype settings/terminal inspection and save the memory prompt configuring Upsy tool precedence.

2. **Success Criteria**
   - Upsy dynamic client registration successfully executed (`/api/oauth/register`).
   - PKCE parameters (code_verifier, code_challenge S256, state, nonce) generated securely.
   - User approval link presented clearly to authorize scopes: memory, files, browser, gmail, calendar, drive, and connected apps.
   - OAuth callback endpoint `/api/oauth/upsy/callback` and CLI callback server receive authorization code, exchange tokens at `https://upsy.ai/api/oauth/token`, and save tokens to `.env` / `upsy_tokens.json`.
   - MCP client successfully queries Upsy's tools and lists them to the user.
   - Memory configuration prompt logged and saved as requested.

3. **Project Requirements**
   - Create Upsy MCP service `/services/upsyMcpService.ts` to manage OAuth 2.1 PKCE, token refresh, and MCP tool discovery/execution.
   - Add backend Express endpoints in `/server.ts` for:
     - `/api/upsy/auth-url`: Generates authorization URL with PKCE and returns approval link.
     - `/api/oauth/upsy/callback`: Handles OAuth redirect, completes token exchange with PKCE code_verifier, and stores tokens.
     - `/api/upsy/status`: Returns connection status and token validity.
     - `/api/upsy/tools`: Queries and lists all tools from Upsy MCP endpoint.
     - `/api/upsy/call`: Executes an MCP tool on Upsy.
   - Build CLI script `/scripts/upsy-mcp.ts` and companion `/skills/upsy-mcp/SKILL.md` for terminal and agent execution.
   - Provide direct OAuth sign-in approval link for the user.

4. **Architecture Decisions**
   - **Protocol**: OAuth 2.1 with PKCE (`S256`), dynamic client registration with `token_endpoint_auth_method: "none"`.
   - **Transport**: Streamable HTTP with Bearer token authentication headers to `https://upsy.ai/connect`.
   - **Persistence**: Store Upsy tokens in `.upsy_tokens.json` and optionally `.env` (`UPSY_ACCESS_TOKEN`, `UPSY_REFRESH_TOKEN`).

5. **Pseudo Code**
   ```shade
   data UpsyAuthState:
     clientId: string
     codeVerifier: string
     state: string
     accessToken: string?
     refreshToken: string?
     tools: ToolDefinition[]

   logic OAuthFlow:
     registerClient(redirectUri) -> clientId
     generatePkce() -> { codeVerifier, codeChallenge }
     createAuthUrl(clientId, codeChallenge, state) -> authUrl
     exchangeToken(code, codeVerifier, clientId) -> { accessToken, refreshToken }
     connectMcp(accessToken) -> MCPClient
     listTools() -> tools
   ```
