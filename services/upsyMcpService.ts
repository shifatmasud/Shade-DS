import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface UpsyTokens {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  obtained_at: number;
}

export interface UpsyClientConfig {
  client_id: string;
  client_secret?: string;
  redirect_uri: string;
  client_id_issued_at?: number;
}

export interface PkceSession {
  code_verifier: string;
  code_challenge: string;
  state: string;
  redirect_uri: string;
  created_at: number;
}

const TOKENS_FILE = path.join(process.cwd(), '.upsy_tokens.json');
const CLIENT_CONFIG_FILE = path.join(process.cwd(), '.upsy_client.json');
const PKCE_SESSIONS_FILE = path.join(process.cwd(), '.upsy_pkce_sessions.json');

const ISSUER = 'https://upsy.ai';
const AUTH_ENDPOINT = 'https://upsy.ai/oauth/authorize';
const TOKEN_ENDPOINT = 'https://upsy.ai/api/oauth/token';
const REGISTER_ENDPOINT = 'https://upsy.ai/api/oauth/register';
const CONNECT_ENDPOINT = 'https://upsy.ai/connect';

export const ALL_SCOPES = [
  "memory", "files", "browser", "gmail", "calendar", "drive", "outlook", 
  "slack", "linear", "atlassian", "todoist", "clickup", "airtable", "notion", 
  "miro", "granola", "fireflies", "calendly", "attio", "close", "intercom", 
  "klaviyo", "customerio", "stripe", "paypal", "webflow", "wix", "zapier", 
  "upstash", "context7", "sentry", "supabase", "neon", "cloudflare", "netlify", 
  "posthog", "huggingface"
];

// Helper: Base64URL encoding
function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Helper: Generate PKCE Verifier and Challenge (S256)
export function generatePkce(): { code_verifier: string; code_challenge: string } {
  const code_verifier = base64UrlEncode(crypto.randomBytes(32));
  const hash = crypto.createHash('sha256').update(code_verifier).digest();
  const code_challenge = base64UrlEncode(hash);
  return { code_verifier, code_challenge };
}

// Token Storage
export function loadTokens(): UpsyTokens | null {
  try {
    if (fs.existsSync(TOKENS_FILE)) {
      const data = fs.readFileSync(TOKENS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading upsy tokens:', e);
  }
  return null;
}

export function saveTokens(tokens: Partial<UpsyTokens>) {
  try {
    const existing = loadTokens() || { access_token: '', obtained_at: Date.now() };
    const merged: UpsyTokens = {
      ...existing,
      ...tokens,
      obtained_at: Date.now(),
    };
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(merged, null, 2), 'utf-8');
    
    // Also export to process.env
    if (merged.access_token) {
      process.env.UPSY_ACCESS_TOKEN = merged.access_token;
    }
    if (merged.refresh_token) {
      process.env.UPSY_REFRESH_TOKEN = merged.refresh_token;
    }
    return merged;
  } catch (e) {
    console.error('Error saving upsy tokens:', e);
    throw e;
  }
}

// Client Config Storage (RFC 7591)
export function loadClientConfig(): UpsyClientConfig | null {
  try {
    if (fs.existsSync(CLIENT_CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CLIENT_CONFIG_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading upsy client config:', e);
  }
  return null;
}

export function saveClientConfig(config: UpsyClientConfig) {
  fs.writeFileSync(CLIENT_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

// Dynamic Client Registration
export async function registerDynamicClient(redirectUris: string[]): Promise<UpsyClientConfig> {
  const existing = loadClientConfig();
  if (existing && existing.client_id && redirectUris.includes(existing.redirect_uri)) {
    return existing;
  }

  const payload = {
    client_name: "Antigravity AI Studio Workspace",
    redirect_uris: redirectUris,
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
  };

  const res = await fetch(REGISTER_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to register dynamic OAuth client: ${res.status} ${errorText}`);
  }

  const data = await res.json();
  const config: UpsyClientConfig = {
    client_id: data.client_id,
    client_secret: data.client_secret,
    redirect_uri: redirectUris[0],
    client_id_issued_at: data.client_id_issued_at,
  };

  saveClientConfig(config);
  return config;
}

// PKCE session management for callback verification
function loadPkceSessions(): Record<string, PkceSession> {
  try {
    if (fs.existsSync(PKCE_SESSIONS_FILE)) {
      return JSON.parse(fs.readFileSync(PKCE_SESSIONS_FILE, 'utf-8'));
    }
  } catch (_) {}
  return {};
}

function savePkceSession(state: string, session: PkceSession) {
  const sessions = loadPkceSessions();
  sessions[state] = session;
  fs.writeFileSync(PKCE_SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
}

export function popPkceSession(state: string): PkceSession | null {
  const sessions = loadPkceSessions();
  const session = sessions[state] || null;
  if (session) {
    delete sessions[state];
    fs.writeFileSync(PKCE_SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
  }
  return session;
}

// Create Authorization URL
export async function createAuthorizationUrl(options?: {
  redirectUri?: string;
  scopes?: string[];
}): Promise<{ url: string; state: string; code_verifier: string; client_id: string; redirect_uri: string }> {
  // Support both Cloud Run URLs, custom host or localhost callback
  const defaultRedirectUri = process.env.PUBLIC_APP_URL 
    ? `${process.env.PUBLIC_APP_URL.replace(/\/$/, '')}/api/oauth/upsy/callback`
    : `https://ais-dev-soqmv42o6nqrg73vgevra3-22244230581.asia-east1.run.app/api/oauth/upsy/callback`;

  const redirectUri = options?.redirectUri || defaultRedirectUri;
  const redirectUris = Array.from(new Set([
    redirectUri,
    'https://ais-dev-soqmv42o6nqrg73vgevra3-22244230581.asia-east1.run.app/api/oauth/upsy/callback',
    'https://ais-pre-soqmv42o6nqrg73vgevra3-22244230581.asia-east1.run.app/api/oauth/upsy/callback',
    'http://localhost:3000/api/oauth/upsy/callback',
    'http://127.0.0.1:3000/api/oauth/upsy/callback'
  ]));

  const client = await registerDynamicClient(redirectUris);
  const { code_verifier, code_challenge } = generatePkce();
  const state = crypto.randomBytes(16).toString('hex');
  const scopes = options?.scopes || ALL_SCOPES;

  savePkceSession(state, {
    code_verifier,
    code_challenge,
    state,
    redirect_uri: redirectUri,
    created_at: Date.now(),
  });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: client.client_id,
    redirect_uri: redirectUri,
    code_challenge,
    code_challenge_method: 'S256',
    scope: scopes.join(' '),
    state,
    prompt: 'consent',
  });

  const authUrl = `${AUTH_ENDPOINT}?${params.toString()}`;
  return {
    url: authUrl,
    state,
    code_verifier,
    client_id: client.client_id,
    redirect_uri: redirectUri,
  };
}

// Exchange Code for Access Token
export async function exchangeCodeForTokens(params: {
  code: string;
  code_verifier: string;
  redirect_uri: string;
  client_id: string;
}): Promise<UpsyTokens> {
  const bodyParams = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: params.client_id,
    code: params.code,
    code_verifier: params.code_verifier,
    redirect_uri: params.redirect_uri,
  });

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: bodyParams.toString(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const tokens: UpsyTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    token_type: data.token_type || 'Bearer',
    expires_in: data.expires_in,
    scope: data.scope,
    obtained_at: Date.now(),
  };

  saveTokens(tokens);
  return tokens;
}

// Refresh Token
export async function refreshAccessToken(): Promise<UpsyTokens> {
  const current = loadTokens();
  const client = loadClientConfig();
  if (!current?.refresh_token) {
    throw new Error('No refresh token available to refresh Upsy access token');
  }
  if (!client?.client_id) {
    throw new Error('No client_id found for token refresh');
  }

  const bodyParams = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: client.client_id,
    refresh_token: current.refresh_token,
  });

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: bodyParams.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Token refresh failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const newTokens: UpsyTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || current.refresh_token,
    token_type: data.token_type || 'Bearer',
    expires_in: data.expires_in,
    scope: data.scope || current.scope,
    obtained_at: Date.now(),
  };

  saveTokens(newTokens);
  return newTokens;
}

// MCP JSON-RPC execution against Upsy connect endpoint
export async function sendUpsyMcpRequest(method: string, params: any = {}) {
  let tokens = loadTokens();
  if (!tokens?.access_token) {
    throw new Error('Upsy is not authenticated. Please complete the OAuth approval flow.');
  }

  const rpcPayload = {
    jsonrpc: "2.0",
    id: Date.now(),
    method,
    params,
  };

  const makeCall = async (token: string) => {
    return await fetch(CONNECT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(rpcPayload),
    });
  };

  let res = await makeCall(tokens.access_token);

  // If 401 Unauthorized, try refresh once
  if (res.status === 401 && tokens.refresh_token) {
    console.log('Access token expired. Refreshing Upsy token...');
    tokens = await refreshAccessToken();
    res = await makeCall(tokens.access_token);
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Upsy MCP request failed (${res.status}): ${errText}`);
  }

  return await res.json();
}

// List Tools from Upsy MCP
export async function listUpsyTools() {
  const res = await sendUpsyMcpRequest('tools/list', {});
  return res.result?.tools || [];
}

// Call Tool on Upsy MCP
export async function callUpsyTool(name: string, args: Record<string, any> = {}) {
  const res = await sendUpsyMcpRequest('tools/call', {
    name,
    arguments: args,
  });
  return res.result;
}
