import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import fs from "fs";
import path from "path";

export interface MCPServerConfig {
  url?: string;
  type?: "http" | "sse" | "stdio";
  command?: string;
  args?: string[];
  headers?: Record<string, string>;
  enabled?: boolean;
  authType?: "oauth" | "api_key";
  authUrl?: string;
  clientId?: string;
  redirectUri?: string;
  metadataUrl?: string;
}

export interface MCPConfig {
  servers: Record<string, MCPServerConfig>;
}

export class UniversalMCPClient {
  private client: Client;
  private transport: any;

  constructor(clientName = "mcp-universal-client", version = "1.0.0") {
    this.client = new Client(
      {
        name: clientName,
        version: version,
      },
      {
        capabilities: {},
      }
    );
  }

  async connectToStdio(command: string, args: string[] = [], env: Record<string, string> = {}) {
    this.transport = new StdioClientTransport({
      command,
      args,
      env: { ...process.env, ...env },
    });
    await this.client.connect(this.transport);
    return this;
  }

  async connectToHTTP(url: string, headers: Record<string, string> = {}, authType?: string, authUrl?: string) {
    const authHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "text/event-stream, application/json",
      ...headers,
    };

    if (authType === "oauth") {
      console.log(`[OAuth] Connecting to Upsy MCP endpoint: ${url}`);
      const oauthToken = process.env.UPSY_OAUTH_TOKEN || process.env.OAUTH_TOKEN || "";
      if (oauthToken) {
        authHeaders["Authorization"] = `Bearer ${oauthToken}`;
      } else {
        console.log(`[OAuth] No UPSY_OAUTH_TOKEN found in environment. Initiating OAuth handshake with ${authUrl || url}...`);
      }
    } else {
      const token = process.env.FIGMA_TOKEN || "";
      if (token) {
        if (token.startsWith("figd_")) {
          authHeaders["X-Figma-Token"] = token;
        } else {
          authHeaders["Authorization"] = `Bearer ${token}`;
        }
      }
    }

    try {
      // Try standard SSE transport first
      this.transport = new SSEClientTransport(new URL(url), {
        eventSourceInit: {
          headers: authHeaders as any,
        } as any,
        requestInit: {
          headers: authHeaders,
        },
      });
      await this.client.connect(this.transport);
    } catch (err: any) {
      console.warn(`SSE connection to ${url} failed (${err.message}). Attempting Streamable HTTP JSON-RPC handshake...`);
      // Streamable HTTP fallback / challenge check
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ jsonrpc: "2.0", method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "workspace-client", version: "1.0.0" } }, id: 1 })
        });
        if (response.status === 401) {
          const authHeader = response.headers.get("www-authenticate") || "";
          console.error(`[OAuth 401 Unauthorized] Server at ${url} requires authentication.`);
          if (authType === "oauth") {
            console.error(`Please authorize via Upsy at: ${authUrl || "https://upsy.ai/connect"} and provide your token using:`);
            console.error(`curl -X POST https://.../api/mcp/upsy/token -d '{"token":"..."}'`);
          }
        }
        const data = await response.json();
        console.log("Streamable HTTP response:", data);
      } catch (fetchErr: any) {
        console.error(`Streamable HTTP connection error:`, fetchErr.message);
        throw err;
      }
    }
    return this;
  }

  async listTools() {
    return await this.client.listTools();
  }

  async callTool(name: string, args: Record<string, unknown> = {}) {
    return await this.client.callTool({
      name,
      arguments: args,
    });
  }

  async close() {
    if (this.transport) {
      await this.transport.close();
    }
  }
}

export function loadMCPConfig(): Record<string, MCPServerConfig> {
  const configPath = path.resolve(process.cwd(), "mcp.json");
  if (!fs.existsSync(configPath)) {
    console.warn("mcp.json not found at workspace root.");
    return {};
  }
  try {
    const raw = fs.readFileSync(configPath, "utf8");
    // Replace env var placeholders like ${VAR_NAME}
    const resolved = raw.replace(/\$\{([^}]+)\}/g, (_: string, name: string) => {
      return process.env[name] || "";
    });
    const parsed = JSON.parse(resolved);
    return parsed.mcpServers || parsed.servers || {};
  } catch (err: any) {
    console.error("Failed to parse mcp.json:", err.message);
    return {};
  }
}

// Interactive CLI command executor when executed directly
async function runCLI() {
  const args = process.argv.slice(2);
  const action = args[0] || "test";

  console.log("=== MCP Client Runner ===");

  if (action === "test") {
    console.log("Connecting to local Figma MCP Server...");
    const client = new UniversalMCPClient();
    await client.connectToStdio("npx", ["tsx", "scripts/figma-mcp-server.ts"]);

    console.log("\n1. Calling tool 'figma_get_me':");
    const meResult = await client.callTool("figma_get_me");
    console.log(JSON.stringify(meResult, null, 2));

    console.log("\n2. Listing all available MCP tools:");
    const toolsResult = await client.listTools();
    console.log(JSON.stringify(toolsResult.tools.map((t) => t.name), null, 2));

    await client.close();
  } else if (action === "auth") {
    const serverName = args[1] || "upsy";
    const servers = loadMCPConfig();
    const serverConfig = servers[serverName];
    if (!serverConfig) {
      console.error(`Server [${serverName}] not found in mcp.json`);
      process.exit(1);
    }
    
    console.log(`\n============================================================`);
    console.log(`[OAuth 2.1 PKCE & Dynamic Registration Helper for ${serverName}]`);
    
    let authEndpoint = serverConfig.authUrl || "https://upsy.ai/oauth/authorize";
    let clientId = serverConfig.clientId || "grok";

    // If clientId is a generic default, try dynamic registration, otherwise use explicit client ID (e.g. grok)
    if (clientId === "upsy-workspace-client") {
      try {
        const metadataUrl = serverConfig.metadataUrl || "https://upsy.ai/.well-known/oauth-authorization-server";
        console.log(`Fetching OAuth metadata from ${metadataUrl}...`);
        const metaRes = await fetch(metadataUrl);
        if (metaRes.ok) {
          const metadata = await metaRes.json();
          if (metadata.authorization_endpoint) {
            authEndpoint = metadata.authorization_endpoint;
          }
          if (metadata.registration_endpoint) {
            console.log(`Performing Dynamic Client Registration (RFC 7591) at ${metadata.registration_endpoint}...`);
            const regRes = await fetch(metadata.registration_endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                client_name: "Grok MCP Client",
                redirect_uris: [serverConfig.redirectUri || "https://ais-dev-soqmv42o6nqrg73vgevra3-22244230581.asia-east1.run.app/api/mcp/upsy/callback"],
                grant_types: ["authorization_code", "refresh_token"],
                response_types: ["code"],
                token_endpoint_auth_method: "none"
              })
            });
            if (regRes.ok) {
              const regData = await regRes.json();
              if (regData.client_id) {
                clientId = regData.client_id;
                console.log(`Successfully registered dynamic client_id: ${clientId}`);
              }
            }
          }
        }
      } catch (e: any) {
        console.warn(`Metadata fetch / dynamic registration warning: ${e.message}.`);
      }
    } else {
      console.log(`Using configured client_id: ${clientId}`);
    }

    // Generate PKCE verifier and challenge
    const crypto = await import("crypto");
    const verifier = crypto.randomBytes(32).toString("base64url");
    const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");

    const urlObj = new URL(authEndpoint);
    urlObj.searchParams.set("client_id", clientId);
    if (serverConfig.redirectUri) {
      urlObj.searchParams.set("redirect_uri", serverConfig.redirectUri);
    }
    urlObj.searchParams.set("response_type", "code");
    urlObj.searchParams.set("code_challenge", challenge);
    urlObj.searchParams.set("code_challenge_method", "S256");

    console.log(`\nOpen this PKCE OAuth URL in your LOCAL machine browser to sign in:`);
    console.log(`\n   ${urlObj.toString()}\n`);
    console.log(`(PKCE Code Verifier saved for token exchange: ${verifier})`);
    console.log(`After signing in, copy your access token or authorization code`);
    console.log(`and save it via:`);
    console.log(`   curl -X POST https://ais-dev-soqmv42o6nqrg73vgevra3-22244230581.asia-east1.run.app/api/mcp/upsy/token -H "Content-Type: application/json" -d '{"token":"YOUR_TOKEN"}'`);
    console.log(`============================================================\n`);
  } else if (action === "remote") {
    const servers = loadMCPConfig();
    console.log(`Loaded ${Object.keys(servers).length} server definitions from mcp.json.`);
    for (const [name, config] of Object.entries(servers)) {
      if (!config.enabled) {
        console.log(`- Server [${name}] is disabled in mcp.json. Skipping.`);
        continue;
      }
      console.log(`\nConnecting to remote server [${name}] at ${config.url} (type: ${config.type || 'sse'})...`);
      const client = new UniversalMCPClient(`mcp-client-${name}`);
      try {
        await client.connectToHTTP(config.url || "", config.headers || {}, config.authType, config.authUrl);
        const tools = await client.listTools();
        console.log(`Successfully connected to [${name}]! Available tools:`, tools.tools.map(t => t.name));
        await client.close();
      } catch (err: any) {
        console.error(`Failed to connect to remote server [${name}]:`, err.message);
      }
    }
  } else if (action === "call") {
    const toolName = args[1];
    const toolArgsJson = args[2] || "{}";
    const toolArgs = JSON.parse(toolArgsJson);

    const client = new UniversalMCPClient();
    await client.connectToStdio("npx", ["tsx", "scripts/figma-mcp-server.ts"]);
    const res = await client.callTool(toolName, toolArgs);
    console.log(JSON.stringify(res, null, 2));
    await client.close();
  }
}

if (process.argv[1] && process.argv[1].endsWith("mcp-client.ts")) {
  runCLI().catch((err) => {
    console.error("MCP Client Error:", err);
    process.exit(1);
  });
}
