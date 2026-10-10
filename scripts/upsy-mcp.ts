import { UniversalMCPClient } from "./mcp-client.js";
import { 
  createAuthorizationUrl, 
  exchangeCodeForTokens, 
  loadTokens, 
  listUpsyTools, 
  callUpsyTool,
  refreshAccessToken 
} from "../services/upsyMcpService.js";

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "status";

  console.log("=== Upsy Remote MCP Server CLI ===");

  if (command === "auth" || command === "login") {
    const redirectUri = args[1];
    const { url, state, client_id } = await createAuthorizationUrl(redirectUri ? { redirectUri } : undefined);
    console.log("\n[OAuth 2.1 with PKCE Initiated]");
    console.log("Client ID:", client_id);
    console.log("State:", state);
    console.log("\n>>> Open this URL to approve Upsy access: <<<");
    console.log(url);
    console.log("\nAfter approval, your browser will redirect to the callback handler and finalize the token exchange.");
  } 
  else if (command === "exchange") {
    const code = args[1];
    const code_verifier = args[2];
    const client_id = args[3];
    const redirect_uri = args[4];

    if (!code || !code_verifier || !client_id || !redirect_uri) {
      console.error("Usage: npx tsx scripts/upsy-mcp.ts exchange <code> <code_verifier> <client_id> <redirect_uri>");
      process.exit(1);
    }

    console.log("Exchanging code for tokens...");
    const tokens = await exchangeCodeForTokens({ code, code_verifier, client_id, redirect_uri });
    console.log("Authentication successful! Token saved.");
    console.log("Scope granted:", tokens.scope);
  }
  else if (command === "status") {
    const tokens = loadTokens();
    if (!tokens?.access_token) {
      console.log("Status: Not authenticated.");
      console.log("Run: npx tsx scripts/upsy-mcp.ts auth");
    } else {
      console.log("Status: Authenticated!");
      console.log("Token obtained at:", new Date(tokens.obtained_at).toLocaleString());
      console.log("Scopes:", tokens.scope || "all requested");
    }
  }
  else if (command === "refresh") {
    console.log("Refreshing access token...");
    const tokens = await refreshAccessToken();
    console.log("Token refreshed successfully!");
  }
  else if (command === "tools" || command === "list") {
    console.log("Querying Upsy MCP tools list...");
    try {
      const tools = await listUpsyTools();
      console.log(`\nDiscovered ${tools.length} Upsy tools:`);
      tools.forEach((t: any, i: number) => {
        console.log(`\n${i + 1}. [${t.name}]`);
        if (t.description) console.log(`   ${t.description}`);
      });
    } catch (e: any) {
      console.error("Failed to list tools:", e.message);
    }
  }
  else if (command === "call") {
    const toolName = args[1];
    const toolArgs = args[2] ? JSON.parse(args[2]) : {};
    if (!toolName) {
      console.error("Usage: npx tsx scripts/upsy-mcp.ts call <tool_name> [json_args]");
      process.exit(1);
    }

    console.log(`Calling tool '${toolName}' with arguments:`, toolArgs);
    try {
      const res = await callUpsyTool(toolName, toolArgs);
      console.log("\nResult:\n", JSON.stringify(res, null, 2));
    } catch (e: any) {
      console.error("Failed to call tool:", e.message);
    }
  }
  else {
    console.log("Unknown command:", command);
    console.log("Available commands: auth, status, refresh, tools, call, exchange");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
