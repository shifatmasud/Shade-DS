import { generatePkce, loadClientConfig, createAuthorizationUrl, popPkceSession, loadTokens, saveTokens, ALL_SCOPES } from "../../services/upsyMcpService.ts";
import crypto from "crypto";
import fs from "fs";
import path from "path";

async function runTestSuite() {
  console.log("=========================================");
  console.log("   UPSY MCP INTEGRATION TEST SUITE      ");
  console.log("=========================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${detail || "Assertion failed"}`);
      failed++;
    }
  }

  // --- Test 1: PKCE S256 Generation RFC 7636 ---
  console.log("--- 1. PKCE S256 Cryptographic Verification ---");
  const pkce = generatePkce();
  assert(typeof pkce.code_verifier === "string" && pkce.code_verifier.length >= 43, "Code verifier generated with >= 43 characters");
  assert(typeof pkce.code_challenge === "string" && pkce.code_challenge.length >= 43, "Code challenge generated with >= 43 characters");

  // Verify challenge mathematically matches SHA256(verifier)
  const manualHash = crypto.createHash("sha256").update(pkce.code_verifier).digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  assert(pkce.code_challenge === manualHash, "Code challenge matches Base64URL(SHA256(code_verifier)) exactly");

  // --- Test 2: Dynamic Client Configuration ---
  console.log("\n--- 2. Dynamic Client Configuration & Registration ---");
  const clientConfig = loadClientConfig();
  assert(clientConfig !== null && !!clientConfig.client_id, "Client config loaded with valid client_id", JSON.stringify(clientConfig));
  if (clientConfig) {
    assert(clientConfig.client_id.startsWith("c_"), "Client ID follows Upsy format ('c_...')", clientConfig.client_id);
  }

  // --- Test 3: OAuth 2.1 Authorization URL & PKCE Session ---
  console.log("\n--- 3. OAuth 2.1 Authorization URL & Session Store ---");
  const redirectUri = "https://ais-dev-soqmv42o6nqrg73vgevra3-22244230581.asia-east1.run.app/api/oauth/upsy/callback";
  const authUrlData = await createAuthorizationUrl({ redirectUri });
  assert(authUrlData.url.startsWith("https://upsy.ai/oauth/authorize"), "Auth URL targets https://upsy.ai/oauth/authorize");
  assert(authUrlData.url.includes("response_type=code"), "Auth URL contains response_type=code");
  assert(authUrlData.url.includes(`client_id=${authUrlData.client_id}`), "Auth URL includes client_id");
  assert(authUrlData.url.includes("code_challenge_method=S256"), "Auth URL specifies code_challenge_method=S256");
  assert(authUrlData.url.includes(`state=${authUrlData.state}`), "Auth URL specifies state parameter");

  // Verify session retrieval and one-time pop
  const retrievedSession = popPkceSession(authUrlData.state);
  assert(retrievedSession !== null, "PKCE session successfully retrieved by state");
  if (retrievedSession) {
    assert(retrievedSession.code_verifier === authUrlData.code_verifier, "Stored code_verifier matches generated verifier");
  }
  const secondPop = popPkceSession(authUrlData.state);
  assert(secondPop === null, "PKCE session is single-use (popped on consumption)");

  // --- Test 4: Live Upsy Remote MCP Endpoint Probe ---
  console.log("\n--- 4. Live Upsy Remote Endpoints Connectivity ---");
  try {
    const probeRes = await fetch("https://upsy.ai/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "tools/list", id: 1 })
    });
    const probeJson = await probeRes.json();
    assert(probeRes.status === 401, "https://upsy.ai/connect returns HTTP 401 when unauthenticated", `Status: ${probeRes.status}`);
    assert(probeJson.error === "invalid_token", "https://upsy.ai/connect JSON-RPC error is 'invalid_token'", JSON.stringify(probeJson));
  } catch (err: any) {
    assert(false, "Live probe to https://upsy.ai/connect", err.message);
  }

  // --- Test 5: Server API Endpoints ---
  console.log("\n--- 5. Server Local API Endpoints Integration ---");
  try {
    const statusRes = await fetch("http://localhost:3000/api/upsy/status");
    const statusJson = await statusRes.json();
    assert(statusRes.ok, "GET /api/upsy/status responds with 200 OK");
    assert(typeof statusJson.connected === "boolean", "Status response includes 'connected' boolean flag");

    const authUrlRes = await fetch("http://localhost:3000/api/upsy/auth-url");
    const authUrlJson = await authUrlRes.json();
    assert(authUrlRes.ok && authUrlJson.success === true, "GET /api/upsy/auth-url responds successfully");
    assert(authUrlJson.url && authUrlJson.url.includes("https://upsy.ai/oauth/authorize"), "Auth URL contains valid authorize link");

    const toolsRes = await fetch("http://localhost:3000/api/upsy/tools");
    const toolsJson = await toolsRes.json();
    assert(!toolsJson.success && toolsJson.error.includes("not authenticated"), "GET /api/upsy/tools gracefully denies unauthenticated requests");

    const callRes = await fetch("http://localhost:3000/api/upsy/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "memory_store", arguments: { key: "test", value: "val" } })
    });
    const callJson = await callRes.json();
    assert(!callJson.success && callJson.error.includes("not authenticated"), "POST /api/upsy/call gracefully denies unauthenticated calls");
  } catch (err: any) {
    assert(false, "Local API endpoint checks", err.message);
  }

  // --- Test 6: Scopes & Service Coverage ---
  console.log("\n--- 6. Requested Scopes & Ecosystem Coverage ---");
  assert(ALL_SCOPES.includes("memory"), "Scope list contains 'memory'");
  assert(ALL_SCOPES.includes("files"), "Scope list contains 'files'");
  assert(ALL_SCOPES.includes("browser"), "Scope list contains 'browser'");
  assert(ALL_SCOPES.includes("gmail"), "Scope list contains 'gmail'");
  assert(ALL_SCOPES.includes("slack"), "Scope list contains 'slack'");
  assert(ALL_SCOPES.includes("supabase"), "Scope list contains 'supabase'");
  console.log(`Total active Upsy scopes registered: ${ALL_SCOPES.length}`);

  // --- Test Summary ---
  console.log("\n=========================================");
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log("=========================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test runner threw uncaught exception:", err);
  process.exit(1);
});
