#!/usr/bin/env node
import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawn, ChildProcess } from "node:child_process";

// Configuration paths
const CONFIG_PATH = path.resolve(process.cwd(), ".upsy.json");
const UPSY_METADATA_URL = "https://upsy.ai/.well-known/oauth-authorization-server";
const UPSY_CONNECT_URL = "https://upsy.ai/connect";

export interface UpsyTokens {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  expires_at?: number;
  scope?: string;
}

export interface UpsyConfig {
  client_id?: string;
  client_id_issued_at?: number;
  redirect_uri?: string;
  tokens?: UpsyTokens;
  scopes?: string[];
  updated_at?: string;
}

export interface OAuthMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint: string;
  scopes_supported: string[];
}

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

// Read and write configuration helper functions
export function loadConfig(): UpsyConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch (err: any) {
    console.warn(`[upsy-cli] Warning: Failed to read ${CONFIG_PATH}: ${err.message}`);
  }
  return {};
}

export function saveConfig(config: UpsyConfig): void {
  config.updated_at = new Date().toISOString();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

// PKCE Helper functions
export function generateCodeVerifier(): string {
  // 64 random bytes encoded as base64url
  return crypto.randomBytes(48).toString("base64url");
}

export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

// Fetch OAuth server metadata
export async function getOAuthMetadata(): Promise<OAuthMetadata> {
  const res = await fetch(UPSY_METADATA_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch OAuth metadata: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as OAuthMetadata;
}

// Dynamic Client Registration (RFC 7591)
export async function registerClient(
  registrationEndpoint: string,
  redirectUri: string,
  scopes: string[]
): Promise<{ client_id: string; client_id_issued_at?: number }> {
  const payload = {
    client_name: "Ai.studio",
    redirect_uris: [redirectUri],
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
    scope: scopes.join(" "),
  };

  const res = await fetch(registrationEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Dynamic client registration failed (${res.status}): ${errorBody}`);
  }

  return (await res.json()) as { client_id: string; client_id_issued_at?: number };
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(
  tokenEndpoint: string,
  clientId: string,
  code: string,
  codeVerifier: string,
  redirectUri: string
): Promise<UpsyTokens> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    code: code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const res = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${errorBody}`);
  }

  const data = (await res.json()) as UpsyTokens;
  if (data.expires_in) {
    data.expires_at = Date.now() + data.expires_in * 1000;
  }
  return data;
}

// Refresh access token
export async function refreshAccessToken(): Promise<UpsyTokens> {
  const config = loadConfig();
  if (!config.tokens?.refresh_token || !config.client_id) {
    throw new Error("Missing client_id or refresh_token in .upsy.json. Please run 'upsy login' first.");
  }

  const meta = await getOAuthMetadata();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: config.client_id,
    refresh_token: config.tokens.refresh_token,
  });

  const res = await fetch(meta.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Token refresh failed (${res.status}): ${errText}`);
  }

  const newTokens = (await res.json()) as UpsyTokens;
  if (newTokens.expires_in) {
    newTokens.expires_at = Date.now() + newTokens.expires_in * 1000;
  }
  if (!newTokens.refresh_token) {
    newTokens.refresh_token = config.tokens.refresh_token;
  }

  config.tokens = newTokens;
  saveConfig(config);
  return newTokens;
}

// Ensure active access token
export async function getValidAccessToken(): Promise<string> {
  const config = loadConfig();
  if (!config.tokens?.access_token) {
    throw new Error("Not logged in. Please run 'upsy login' to authenticate with Upsy.");
  }

  // Check expiration with 60 second safety buffer
  if (config.tokens.expires_at && Date.now() > config.tokens.expires_at - 60000) {
    if (config.tokens.refresh_token) {
      console.log("[upsy-cli] Access token expired. Refreshing token...");
      const refreshed = await refreshAccessToken();
      return refreshed.access_token;
    }
  }

  return config.tokens.access_token;
}

// Start Cloudflare Quick Tunnel for port
export function startCloudflareTunnel(port: number): Promise<{ tunnelUrl: string; process: ChildProcess }> {
  return new Promise((resolve, reject) => {
    const cloudflared = spawn("cloudflared", ["tunnel", "--protocol", "http2", "--url", `http://127.0.0.1:${port}`]);
    let resolved = false;
    let accumulatedLogs = "";

    const timer = setTimeout(() => {
      if (!resolved) {
        reject(new Error(`Timed out waiting for Cloudflare Tunnel URL. Logs: ${accumulatedLogs}`));
      }
    }, 25000);

    const onData = (data: Buffer) => {
      const text = data.toString();
      accumulatedLogs += text;
      const match = accumulatedLogs.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
      if (match && !resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve({ tunnelUrl: match[0], process: cloudflared });
      }
    };

    cloudflared.stdout.on("data", onData);
    cloudflared.stderr.on("data", onData);

    cloudflared.on("error", (err) => {
      clearTimeout(timer);
      if (!resolved) reject(err);
    });

    cloudflared.on("exit", (code) => {
      clearTimeout(timer);
      if (!resolved) {
        reject(new Error(`cloudflared exited unexpectedly with code ${code}. Logs: ${accumulatedLogs}`));
      }
    });
  });
}

// Streamable HTTP JSON-RPC 2.0 MCP Client
export class UpsyMcpClient {
  private endpoint: string;
  private token: string;
  private messageId = 1;

  constructor(token: string, endpoint = UPSY_CONNECT_URL) {
    this.token = token;
    this.endpoint = endpoint;
  }

  private async request(method: string, params: Record<string, unknown> = {}): Promise<any> {
    const id = this.messageId++;
    const payload = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`MCP Request failed (${res.status} ${res.statusText}): ${errText}`);
    }

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("text/event-stream")) {
      const text = await res.text();
      const lines = text.split("\n");
      for (const line of lines) {
        if (line.startsWith("data:")) {
          const jsonStr = line.slice(5).trim();
          if (jsonStr) {
            try {
              const data = JSON.parse(jsonStr);
              if (data.error) throw new Error(`MCP Error [${data.error.code}]: ${data.error.message}`);
              return data.result;
            } catch (pErr) {}
          }
        }
      }
    }

    const json = await res.json();
    if (json.error) {
      throw new Error(`MCP Error [${json.error.code}]: ${json.error.message}`);
    }
    return json.result;
  }

  async initialize(): Promise<any> {
    return await this.request("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "upsy-cli",
        version: "1.0.0",
      },
    });
  }

  async listTools(): Promise<McpTool[]> {
    const result = await this.request("tools/list", {});
    return (result?.tools || []) as McpTool[];
  }

  async callTool(name: string, args: Record<string, unknown> = {}): Promise<any> {
    const result = await this.request("tools/call", {
      name,
      arguments: args,
    });
    return result;
  }
}

// Interactive Login Command
export async function runLogin() {
  const PORT = 8787;
  console.log("\n=======================================================");
  console.log("  Upsy Remote MCP Server - OAuth 2.1 Sign-In");
  console.log("=======================================================\n");

  console.log("1. Fetching Upsy OAuth server metadata...");
  const meta = await getOAuthMetadata();
  console.log(`   Issuer: ${meta.issuer}`);
  console.log(`   Supported Scopes: ${meta.scopes_supported.length} scopes found`);

  // Start local HTTP callback server
  let authCode: string | null = null;
  let receivedState: string | null = null;
  let callbackError: string | null = null;
  let serverResolve: (val: { code: string; state: string }) => void;
  let serverReject: (err: Error) => void;

  const callbackPromise = new Promise<{ code: string; state: string }>((resolve, reject) => {
    serverResolve = resolve;
    serverReject = reject;
  });

  const server = http.createServer((req, res) => {
    const reqUrl = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);
    if (reqUrl.pathname === "/oauth/callback") {
      const code = reqUrl.searchParams.get("code");
      const state = reqUrl.searchParams.get("state");
      const error = reqUrl.searchParams.get("error");
      const errorDesc = reqUrl.searchParams.get("error_description");

      if (error) {
        callbackError = `${error}: ${errorDesc || ""}`;
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`
          <html>
            <body style="font-family:sans-serif;text-align:center;padding:50px;background:#111;color:#f87171;">
              <h2>Authorization Denied</h2>
              <p>${error} - ${errorDesc || ""}</p>
            </body>
          </html>
        `);
        serverReject(new Error(callbackError));
        return;
      }

      if (code && state) {
        authCode = code;
        receivedState = state;
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`
          <!DOCTYPE html>
          <html>
            <head><title>Upsy Connected</title></head>
            <body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;text-align:center;padding:60px 20px;background:#090d16;color:#e2e8f0;">
              <div style="max-width:480px;margin:0 auto;background:#131c2e;border:1px solid #1e293b;border-radius:16px;padding:36px;box-shadow:0 10px 25px rgba(0,0,0,0.5);">
                <div style="font-size:48px;margin-bottom:16px;">✨</div>
                <h1 style="color:#38bdf8;margin:0 0 12px;font-size:24px;font-weight:600;">Upsy Authorization Approved</h1>
                <p style="color:#94a3b8;font-size:15px;line-height:1.5;margin-bottom:24px;">
                  Your authorization code was received. You can now close this tab and return to your terminal to complete the connection.
                </p>
                <div style="background:#0f172a;border-radius:8px;padding:12px;color:#38bdf8;font-size:13px;font-family:monospace;">
                  Status: Handshake in progress...
                </div>
              </div>
            </body>
          </html>
        `);
        serverResolve({ code, state });
        return;
      }

      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("Missing code or state parameter.");
    } else {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
    }
  });

  await new Promise<void>((resolve) => server.listen(PORT, "0.0.0.0", resolve));
  console.log(`2. Local callback server listening on port ${PORT}`);

  console.log("3. Establishing Cloudflare Quick Tunnel for headless callback...");
  let tunnelUrl = "";
  let tunnelProcess: ChildProcess | null = null;
  try {
    const tunnel = await startCloudflareTunnel(PORT);
    tunnelUrl = tunnel.tunnelUrl;
    tunnelProcess = tunnel.process;
    console.log(`   Tunnel established: ${tunnelUrl}`);
  } catch (tunnelErr: any) {
    console.warn(`   Warning: Could not start Cloudflare tunnel: ${tunnelErr.message}`);
    console.log("   Falling back to direct manual code exchange.");
  }

  const redirectUri = tunnelUrl ? `${tunnelUrl}/oauth/callback` : `http://127.0.0.1:${PORT}/oauth/callback`;
  const scopes = meta.scopes_supported;

  console.log("4. Registering OAuth client dynamically with Upsy...");
  const registration = await registerClient(meta.registration_endpoint, redirectUri, scopes);
  console.log(`   Client ID: ${registration.client_id}`);

  // Generate PKCE credentials
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = crypto.randomBytes(16).toString("hex");

  const authUrl = new URL(meta.authorization_endpoint);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", registration.client_id);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", scopes.join(" "));
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("state", state);

  console.log("\n=======================================================================");
  console.log("  ACTION REQUIRED: APPROVE UPSY SIGN-IN IN YOUR BROWSER");
  console.log("=======================================================================\n");
  console.log("👉 Click or open the following link to approve Upsy permissions:\n");
  console.log(authUrl.toString());
  console.log("\n-----------------------------------------------------------------------");
  console.log(`Waiting for authorization callback at ${redirectUri} ...`);
  console.log("-----------------------------------------------------------------------\n");

  // Save pending session config with PKCE state
  const config = loadConfig();
  config.client_id = registration.client_id;
  config.client_id_issued_at = registration.client_id_issued_at;
  config.redirect_uri = redirectUri;
  config.scopes = scopes;
  (config as any).code_verifier = codeVerifier;
  (config as any).state = state;
  (config as any).auth_url = authUrl.toString();
  saveConfig(config);
  fs.writeFileSync(path.resolve(process.cwd(), ".upsy-auth-url.txt"), authUrl.toString(), "utf-8");

  // Await callback or user input
  try {
    const callbackData = await Promise.race([
      callbackPromise,
      new Promise<{ code: string; state: string }>((_, reject) => {
        setTimeout(() => reject(new Error("Timeout waiting for OAuth approval (15 minutes).")), 900000);
      }),
    ]);

    if (callbackData.state && callbackData.state !== state) {
      throw new Error(`State mismatch: expected ${state}, got ${callbackData.state}`);
    }

    console.log("\n5. Exchanging authorization code for OAuth tokens...");
    const tokens = await exchangeCodeForTokens(
      meta.token_endpoint,
      registration.client_id,
      callbackData.code,
      codeVerifier,
      redirectUri
    );

    config.tokens = tokens;
    saveConfig(config);
    console.log("   OAuth tokens successfully saved to .upsy.json!");

    // Clean up server and tunnel
    server.close();
    if (tunnelProcess) tunnelProcess.kill();

    console.log("\n6. Initializing and verifying Upsy MCP connection...");
    const client = new UpsyMcpClient(tokens.access_token);
    await client.initialize();
    console.log("   MCP handshake initialized successfully!");

    console.log("\n7. Discovering tools available in Upsy...");
    const tools = await client.listTools();
    console.log(`   Discovered ${tools.length} MCP tools!`);

    printToolsTable(tools);
    printMemoryGuideline(tools);
  } catch (err: any) {
    server.close();
    if (tunnelProcess) tunnelProcess.kill();
    throw err;
  }
}

export function printToolsTable(tools: McpTool[]) {
  console.log("\nAvailable Upsy MCP Tools:");
  console.log("------------------------------------------------------------------------------------------------");
  console.log(String("Tool Name").padEnd(30) + String("Description").padEnd(65));
  console.log("------------------------------------------------------------------------------------------------");
  for (const t of tools) {
    const desc = (t.description || "").replace(/\n/g, " ").slice(0, 62);
    console.log(t.name.padEnd(30) + desc.padEnd(65));
  }
  console.log("------------------------------------------------------------------------------------------------\n");
}

export function printMemoryGuideline(tools: McpTool[]) {
  // Categorize tools into human-readable capability list
  const toolNames = tools.map((t) => t.name.toLowerCase());
  const capabilities = new Set<string>();

  if (toolNames.some((n) => n.includes("memory") || n.includes("recall") || n.includes("note"))) capabilities.add("memory");
  if (toolNames.some((n) => n.includes("file") || n.includes("folder") || n.includes("doc"))) capabilities.add("files");
  if (toolNames.some((n) => n.includes("browser") || n.includes("web") || n.includes("scrape"))) capabilities.add("browser");
  if (toolNames.some((n) => n.includes("mail") || n.includes("gmail") || n.includes("outlook") || n.includes("email"))) capabilities.add("email");
  if (toolNames.some((n) => n.includes("calendar") || n.includes("event") || n.includes("schedule"))) capabilities.add("calendar");
  if (toolNames.some((n) => n.includes("task") || n.includes("todo") || n.includes("linear") || n.includes("clickup"))) capabilities.add("tasks");
  if (toolNames.some((n) => n.includes("slack") || n.includes("chat") || n.includes("message"))) capabilities.add("messages");
  if (toolNames.some((n) => n.includes("drive") || n.includes("cloud"))) capabilities.add("cloud drive");

  // Fallback if generic
  if (capabilities.size === 0) {
    capabilities.add("memory");
    capabilities.add("files");
    capabilities.add("browser");
    capabilities.add("connected apps");
  }

  const covers = Array.from(capabilities).join(", ");
  console.log("=======================================================================");
  console.log("  AGENT MEMORY INSTRUCTION");
  console.log("=======================================================================");
  console.log(`\n"Upsy has my ${covers}. Use it for these even when I don't mention Upsy, and prefer it over other connectors for the same thing."\n`);
  console.log("=======================================================================\n");
}

// Status command
export async function runStatus() {
  const config = loadConfig();
  console.log("\n=== Upsy Configuration Status ===");
  console.log(`Config file: ${CONFIG_PATH}`);
  console.log(`Client ID: ${config.client_id || "Not registered"}`);
  console.log(`Redirect URI: ${config.redirect_uri || "None"}`);
  console.log(`Configured Scopes: ${config.scopes?.length || 0} scopes`);

  if (!config.tokens?.access_token) {
    console.log("Status: Not authenticated. Run 'upsy login' to connect.");
    return;
  }

  console.log("Status: Authenticated");
  if (config.tokens.expires_at) {
    const remainingMs = config.tokens.expires_at - Date.now();
    const remainingMins = Math.round(remainingMs / 60000);
    console.log(`Token Expiry: ${remainingMins > 0 ? `Expires in ${remainingMins} minutes` : "Expired"}`);
  }

  try {
    const token = await getValidAccessToken();
    const client = new UpsyMcpClient(token);
    await client.initialize();
    const tools = await client.listTools();
    console.log(`MCP Endpoint: Connected (${tools.length} tools available)`);
  } catch (err: any) {
    console.log(`MCP Endpoint Error: ${err.message}`);
  }
}

// List Tools command
export async function runTools() {
  const token = await getValidAccessToken();
  const client = new UpsyMcpClient(token);
  console.log("Connecting to Upsy MCP streamable HTTP...");
  await client.initialize();
  const tools = await client.listTools();
  console.log(`Successfully retrieved ${tools.length} tools.`);
  printToolsTable(tools);
  printMemoryGuideline(tools);
}

// Call Tool command
export async function runCall(toolName: string, argsJson = "{}") {
  if (!toolName) {
    console.error("Usage: upsy call <tool_name> '[json_arguments]'");
    process.exit(1);
  }

  const token = await getValidAccessToken();
  const client = new UpsyMcpClient(token);
  await client.initialize();

  let parsedArgs = {};
  try {
    parsedArgs = JSON.parse(argsJson);
  } catch (e: any) {
    console.error(`Invalid JSON arguments: ${e.message}`);
    process.exit(1);
  }

  console.log(`Calling Upsy tool '${toolName}' with arguments:`, parsedArgs);
  const result = await client.callTool(toolName, parsedArgs);
  console.log("\nResult:\n", JSON.stringify(result, null, 2));
}

export async function runExchange(rawCodeOrUrl: string) {
  if (!rawCodeOrUrl) {
    console.error("Usage: upsy exchange <authorization_code_or_redirect_url>");
    process.exit(1);
  }

  let code = rawCodeOrUrl.trim();
  if (code.includes("code=")) {
    try {
      const u = new URL(code.startsWith("http") ? code : `http://localhost/${code}`);
      code = u.searchParams.get("code") || code;
    } catch {}
  }

  const config = loadConfig() as any;
  if (!config.client_id || !config.code_verifier || !config.redirect_uri) {
    throw new Error("Missing client_id, code_verifier, or redirect_uri in .upsy.json. Please start with 'upsy login'.");
  }

  const meta = await getOAuthMetadata();
  console.log("Exchanging authorization code for OAuth tokens...");
  const tokens = await exchangeCodeForTokens(
    meta.token_endpoint,
    config.client_id,
    code,
    config.code_verifier,
    config.redirect_uri
  );

  config.tokens = tokens;
  saveConfig(config);
  console.log("OAuth tokens successfully exchanged and saved to .upsy.json!");

  console.log("Connecting to Upsy MCP streamable HTTP...");
  const client = new UpsyMcpClient(tokens.access_token);
  await client.initialize();
  const tools = await client.listTools();
  console.log(`Discovered ${tools.length} MCP tools!`);
  printToolsTable(tools);
  printMemoryGuideline(tools);
}

// CLI entry point
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "help";

  try {
    switch (command) {
      case "login":
      case "auth":
      case "connect":
        await runLogin();
        break;
      case "exchange":
        await runExchange(args[1]);
        break;
      case "status":
        await runStatus();
        break;
      case "tools":
      case "list":
        await runTools();
        break;
      case "refresh":
        console.log("Refreshing access token...");
        await refreshAccessToken();
        console.log("Token refreshed successfully.");
        break;
      case "call":
        await runCall(args[1], args[2]);
        break;
      case "help":
      default:
        console.log(`
Upsy Remote MCP CLI Tool

Usage:
  upsy login             Start OAuth 2.1 PKCE login with Cloudflare tunnel
  upsy exchange <code>   Manually exchange an authorization code or redirect URL
  upsy status            Check connection and token status
  upsy tools             List all available tools from Upsy MCP
  upsy call <name> [args] Execute an MCP tool with JSON arguments
  upsy refresh           Manually refresh the access token
        `);
        break;
    }
  } catch (err: any) {
    console.error(`\n[upsy-cli Error] ${err.message}`);
    process.exit(1);
  }
}

if (process.argv[1] && (process.argv[1].endsWith("upsy-cli.ts") || process.argv[1].endsWith("upsy"))) {
  main();
}
