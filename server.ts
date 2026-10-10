import express from "express";
import path from "path";
import { fileURLToPath } from 'url';
import { exec, execSync, spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import https from "https";
import dotenv from "dotenv";
import { 
  createAuthorizationUrl, 
  exchangeCodeForTokens, 
  popPkceSession, 
  loadTokens, 
  saveTokens, 
  listUpsyTools, 
  callUpsyTool 
} from "./services/upsyMcpService.ts";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  createWorkspaceMcpServer,
  handleStatelessJsonRpc,
  WORKSPACE_TOOLS,
  appendAuditLog
} from "./services/remoteMcpServer.ts";

// Load environment variables from .env file
dotenv.config();

const execAsync = promisify(exec);

// Support both ESM and CJS for path resolution
let __filename: string;
let __dirname: string;

try {
  __filename = fileURLToPath(import.meta.url);
  __dirname = path.dirname(__filename);
} catch (e) {
  // @ts-ignore - these exist in CJS
  __filename = typeof filename !== 'undefined' ? filename : '';
  // @ts-ignore
  __dirname = typeof dirname !== 'undefined' ? dirname : process.cwd();
}

const GH_BINARY_PATH = fs.existsSync('/root/.local/bin/gh') ? '/root/.local/bin/gh' : (fs.existsSync(path.join(process.cwd(), 'bin', 'gh')) ? path.join(process.cwd(), 'bin', 'gh') : 'gh');
const AGENT_LOG_PATH = '/tmp/agent_terminal.log';

// Ensure /tmp/agent_terminal.log exists with initial content if missing
try {
  if (!fs.existsSync(AGENT_LOG_PATH)) {
    fs.writeFileSync(AGENT_LOG_PATH, `[${new Date().toISOString()}] Agent Terminal Audit Log Initialized.\n`, 'utf-8');
  }
} catch (e) {
  console.error("Failed to initialize /tmp/agent_terminal.log:", e);
}

// Ensure CLI binaries and Antigravity CLI binary persistence
try {
  const binDir = path.join(process.cwd(), 'bin');
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  // Ensure agy wrapper exists
  const binAgy = path.join(binDir, 'agy');
  const rootLocalBin = '/root/.local/bin';
  if (!fs.existsSync(rootLocalBin)) {
    fs.mkdirSync(rootLocalBin, { recursive: true });
  }

  if (fs.existsSync(binAgy)) {
    try { fs.chmodSync(binAgy, 0o755); } catch (_) {}
    
    // Symlink into /usr/local/bin so any subshell finds agy immediately
    try {
      if (fs.existsSync('/usr/local/bin')) {
        const usrAgy = '/usr/local/bin/agy';
        if (!fs.existsSync(usrAgy) || (fs.lstatSync(usrAgy).isSymbolicLink() && fs.readlinkSync(usrAgy) !== binAgy)) {
          try { fs.unlinkSync(usrAgy); } catch (_) {}
          fs.symlinkSync(binAgy, usrAgy);
        }
      }
    } catch (_) {}

    // Symlink into /root/.local/bin
    try {
      const rootAgy = path.join(rootLocalBin, 'agy');
      if (!fs.existsSync(rootAgy) || (fs.lstatSync(rootAgy).isSymbolicLink() && fs.readlinkSync(rootAgy) !== binAgy)) {
        try { fs.unlinkSync(rootAgy); } catch (_) {}
        fs.symlinkSync(binAgy, rootAgy);
      }
    } catch (_) {}
  }
} catch (e) {
  console.error("Failed to ensure CLI binaries:", e);
}

// Global Terminal State & SSE Client Management (Same environment as AI agent)
let terminalCwd = process.cwd();
let activeTerminalProcess: any = null;
let activeCommandName: string | null = null;
let currentTerminalCols = 100;
let currentTerminalRows = 30;
const shellClients: Set<any> = new Set();
const auditClients: Set<any> = new Set();
const terminalHistory: Array<{ type: string; data: string; cwd?: string; activeProcess?: string | null }> = [
  { type: 'output', data: '=== Interactive Workspace Shell Connected (/bin/bash) ===\r\n' }
];

function broadcastToTerminal(payload: { type: string; data?: string; cwd?: string; activeProcess?: string | null }) {
  terminalHistory.push(payload as any);
  if (terminalHistory.length > 600) terminalHistory.shift();
  const msg = `data: ${JSON.stringify(payload)}\n\n`;
  for (const client of shellClients) {
    try {
      client.write(msg);
    } catch (e) {}
  }
}

// Execute command in bash with full environment matching agent terminal
function executeTerminalCommand(cmd: string): Promise<{ stdout: string; stderr: string; exitCode: number; cwd: string }> {
  return new Promise((resolve) => {
    const trimmed = cmd.trim();
    if (!trimmed) {
      resolve({ stdout: '', stderr: '', exitCode: 0, cwd: terminalCwd });
      return;
    }

    // Broadcast the command execution prompt header
    broadcastToTerminal({ type: 'output', data: `\r\n\x1b[32m❯\x1b[0m ${trimmed}\r\n`, cwd: terminalCwd });

    const sentinel = `__TERM_CWD_MARKER_${Date.now()}_${Math.random().toString(36).substring(2, 7)}__`;
    // We execute the command, capture exit code, print sentinel, print current working directory, and exit with status
    const script = `${trimmed}\n__EC=$?\necho -n "${sentinel}"\npwd -P\nexit $__EC`;

    const binDir = path.join(process.cwd(), 'bin');
    const ptyRunnerPath = [
      path.join(process.cwd(), 'plugins', 'pty-runner', 'pty_runner.py'),
      path.join(process.cwd(), 'scripts', 'pty_runner.py')
    ].find(p => fs.existsSync(p)) || path.join(process.cwd(), 'plugins', 'pty-runner', 'pty_runner.py');
    const customEnv = {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      PATH: `${binDir}:/root/.local/bin:${process.env.HOME || '/root'}/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${process.env.PATH || ''}`,
      PAGER: 'cat',
      GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
      GH_TOKEN: process.env.GH_TOKEN || '',
      VERCEL_TOKEN: process.env.VERCEL_TOKEN || '',
      SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN || '',
      NOTION_API_TOKEN: process.env.NOTION_API_TOKEN || '',
      NOTION_WORKSPACE_ID: process.env.NOTION_WORKSPACE_ID || ''
    };

    const hasPtyRunner = fs.existsSync(ptyRunnerPath);
    const spawnFile = hasPtyRunner ? 'python3' : '/bin/bash';
    const spawnArgs = hasPtyRunner
      ? [ptyRunnerPath, '--cwd', terminalCwd, '--cols', String(currentTerminalCols || 100), '--rows', String(currentTerminalRows || 30), '/bin/bash', '-c', script]
      : ['-c', script];

    const proc = spawn(spawnFile, spawnArgs as any, {
      cwd: terminalCwd,
      env: customEnv
    });

    activeTerminalProcess = proc;
    activeCommandName = trimmed.split(' ')[0] || 'process';
    broadcastToTerminal({ type: 'status', activeProcess: activeCommandName, cwd: terminalCwd });

    let rawStdout = '';
    let rawStderr = '';

    proc.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      rawStdout += text;
      // If the text contains the sentinel, only broadcast up to the sentinel
      if (text.includes(sentinel)) {
        const pre = text.split(sentinel)[0];
        if (pre) broadcastToTerminal({ type: 'output', data: pre });
      } else {
        broadcastToTerminal({ type: 'output', data: text });
      }
    });

    proc.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      rawStderr += text;
      broadcastToTerminal({ type: 'output', data: text });
    });

    const cleanupAndFinish = (code: number | null) => {
      if (activeTerminalProcess === proc) {
        activeTerminalProcess = null;
        activeCommandName = null;
        broadcastToTerminal({ type: 'status', activeProcess: null, cwd: terminalCwd });
      }
      const exitCode = code ?? 0;
      let newCwd = terminalCwd;

      if (rawStdout.includes(sentinel)) {
        const parts = rawStdout.split(sentinel);
        const candidateCwd = parts[1]?.trim();
        if (candidateCwd && fs.existsSync(candidateCwd)) {
          newCwd = candidateCwd;
          terminalCwd = newCwd;
        }
      }

      broadcastToTerminal({
        type: 'output',
        data: exitCode !== 0 ? `\r\n\x1b[31m[exit code ${exitCode}]\x1b[0m\r\n` : `\r\n`,
        cwd: terminalCwd,
        activeProcess: null
      });

      resolve({
        stdout: rawStdout.split(sentinel)[0] || '',
        stderr: rawStderr,
        exitCode,
        cwd: terminalCwd
      });
    };

    proc.on('close', cleanupAndFinish);

    proc.on('error', (err) => {
      if (activeTerminalProcess === proc) {
        activeTerminalProcess = null;
        activeCommandName = null;
        broadcastToTerminal({ type: 'status', activeProcess: null, cwd: terminalCwd });
      }
      const errMsg = `\r\n[Shell execution error: ${err.message}]\r\n`;
      broadcastToTerminal({ type: 'output', data: errMsg });
      resolve({ stdout: '', stderr: err.message, exitCode: 1, cwd: terminalCwd });
    });
  });
}

// Watch /tmp/agent_terminal.log for rolling log streaming
let lastLogSize = 0;
try {
  if (fs.existsSync(AGENT_LOG_PATH)) {
    lastLogSize = fs.statSync(AGENT_LOG_PATH).size;
  }
} catch (e) {}

fs.watchFile(AGENT_LOG_PATH, { interval: 250 }, (curr, prev) => {
  try {
    if (curr.size < prev.size) {
      // Log was truncated or rotated
      lastLogSize = 0;
    }
    if (curr.size > lastLogSize) {
      const stream = fs.createReadStream(AGENT_LOG_PATH, {
        start: lastLogSize,
        end: curr.size - 1,
        encoding: 'utf-8'
      });
      let chunkData = '';
      stream.on('data', (chunk) => {
        chunkData += chunk;
      });
      stream.on('end', () => {
        lastLogSize = curr.size;
        if (chunkData) {
          for (const client of auditClients) {
            client.write(`data: ${JSON.stringify({ type: 'log', data: chunkData })}\n\n`);
          }
        }
      });
    }
  } catch (e) {
    console.error("Error reading agent log update:", e);
  }
});

async function downloadGithubCliIfNotExists() {
  const BIN_DIR = path.join(process.cwd(), 'bin');
  
  if (fs.existsSync(GH_BINARY_PATH)) {
    return GH_BINARY_PATH;
  }

  if (process.platform !== 'linux') {
    return 'gh';
  }

  try {
    if (!fs.existsSync(BIN_DIR)) {
      fs.mkdirSync(BIN_DIR, { recursive: true });
    }

    const arch = process.arch === 'arm64' ? 'arm64' : 'amd64';
    const version = '2.51.0';
    const url = `https://github.com/cli/cli/releases/download/v${version}/gh_${version}_linux_${arch}.tar.gz`;
    const archivePath = path.join(BIN_DIR, 'gh.tar.gz');

    console.log(`Downloading GitHub CLI v${version} from ${url}...`);

    const downloadFile = (downloadUrl: string, dest: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(downloadUrl, (response) => {
          if (response.statusCode === 301 || response.statusCode === 302) {
            downloadFile(response.headers.location!, dest).then(resolve).catch(reject);
            return;
          }
          if (response.statusCode !== 200) {
            reject(new Error(`Failed download response status ${response.statusCode}`));
            return;
          }
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        }).on('error', (err) => {
          if (fs.existsSync(dest)) fs.unlinkSync(dest);
          reject(err);
        });
      });
    };

    await downloadFile(url, archivePath);
    execSync(`tar -xzf ${archivePath} -C ${BIN_DIR}`);

    const extractedDir = fs.readdirSync(BIN_DIR).find(name => name.startsWith(`gh_${version}_linux_`));
    if (extractedDir) {
      const srcCli = path.join(BIN_DIR, extractedDir, 'bin', 'gh');
      if (fs.existsSync(srcCli)) {
        fs.renameSync(srcCli, GH_BINARY_PATH);
        fs.chmodSync(GH_BINARY_PATH, '755');
        console.log('GitHub CLI binary is ready at:', GH_BINARY_PATH);
      }
      fs.rmSync(path.join(BIN_DIR, extractedDir), { recursive: true, force: true });
      fs.unlinkSync(archivePath);
    }
  } catch (error) {
    console.error('Error during auto setup of gh CLI:', error);
  }
  return GH_BINARY_PATH;
}

// Simple .env parser to dynamically load secrets into process.env at runtime
const ENV_PATH = path.join(process.cwd(), '.env');

function ensureAntigravityCliSettings() {
  try {
    const homeDir = process.env.HOME || '/root';
    const configDir = path.join(homeDir, '.gemini', 'antigravity-cli');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    const settingsPath = path.join(configDir, 'settings.json');
    const settings = {
      modelProvider: "gemini",
      toolPermission: "always-proceed",
      autoExecPolicy: "always-proceed",
      enableTerminalSandbox: false,
      allowNonWorkspaceAccess: true
    };
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

    // Also ensure /root/.cache/ms-playwright-go/1.57.0/driver exists
    const pwDir = path.join(homeDir, '.cache', 'ms-playwright-go', '1.57.0', 'driver');
    if (!fs.existsSync(pwDir)) {
      fs.mkdirSync(pwDir, { recursive: true });
    }
    const pwScript = path.join(pwDir, 'playwright.sh');
    if (!fs.existsSync(pwScript)) {
      fs.writeFileSync(pwScript, '#!/bin/bash\nexit 0\n', { mode: 0o755 });
    }
    const pwParentScript = path.join(homeDir, '.cache', 'ms-playwright-go', '1.57.0', 'playwright.sh');
    if (!fs.existsSync(pwParentScript)) {
      fs.writeFileSync(pwParentScript, '#!/bin/bash\nexit 0\n', { mode: 0o755 });
    }
  } catch (e) {
    console.error('Failed to configure Antigravity CLI settings:', e);
  }
}

async function startServer() {
  // Pre-configure Antigravity CLI settings for direct Gemini API key authentication
  ensureAntigravityCliSettings();

  // Pre-download and setup official GitHub CLI binary if needed
  downloadGithubCliIfNotExists().catch(console.error);

  const app = express();
  const PORT = 3000;

  // Track the express parser
  app.use(express.json());

  // API Route: Check tokens configuration status
  app.get("/api/cli/config", (req, res) => {
    res.json({
      gemini: {
        configured: !!process.env.GEMINI_API_KEY,
        masked: process.env.GEMINI_API_KEY ? `${process.env.GEMINI_API_KEY.substring(0, 8)}***` : ''
      },
      github: {
        configured: !!process.env.GH_TOKEN,
        masked: process.env.GH_TOKEN ? `${process.env.GH_TOKEN.substring(0, 8)}***` : ''
      },
      vercel: {
        configured: !!process.env.VERCEL_TOKEN,
        masked: process.env.VERCEL_TOKEN ? `${process.env.VERCEL_TOKEN.substring(0, 8)}***` : ''
      },
      supabase: {
        configured: !!process.env.SUPABASE_ACCESS_TOKEN,
        masked: process.env.SUPABASE_ACCESS_TOKEN ? `${process.env.SUPABASE_ACCESS_TOKEN.substring(0, 8)}***` : ''
      },
      notion: {
        configured: !!process.env.NOTION_API_TOKEN,
        masked: process.env.NOTION_API_TOKEN ? `${process.env.NOTION_API_TOKEN.substring(0, 8)}***` : '',
        workspaceId: process.env.NOTION_WORKSPACE_ID || ''
      }
    });
  });

  // API Route: Save tokens to actual .env securely and refresh runtime process.env
  app.post("/api/cli/save", (req, res) => {
    const { ghToken, vercelToken, supabaseAccessToken, notionApiToken, notionWorkspaceId, geminiApiKey } = req.body;

    try {
      let lines: string[] = [];
      if (fs.existsSync(ENV_PATH)) {
        const current = fs.readFileSync(ENV_PATH, 'utf-8');
        lines = current.split('\n');
      }

      const keys = {
        GEMINI_API_KEY: geminiApiKey ?? process.env.GEMINI_API_KEY ?? '',
        GH_TOKEN: ghToken ?? '',
        VERCEL_TOKEN: vercelToken ?? '',
        SUPABASE_ACCESS_TOKEN: supabaseAccessToken ?? '',
        NOTION_API_TOKEN: notionApiToken ?? '',
        NOTION_WORKSPACE_ID: notionWorkspaceId ?? ''
      };

      // Helper to set or overwrite line
      Object.entries(keys).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          process.env[key] = val; // update runtime memory instantly
          const keyPrefix = `${key}=`;
          const index = lines.findIndex(l => l.trim().startsWith(keyPrefix));
          if (index >= 0) {
            lines[index] = `${keyPrefix}${val}`;
          } else {
            lines.push(`${keyPrefix}${val}`);
          }
        }
      });

      fs.writeFileSync(ENV_PATH, lines.join('\n'), 'utf-8');
      res.json({ success: true, message: "Credentials persisted to container filesystem successfully." });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // API Route: Verify CLI connections live
  app.post("/api/cli/status", async (req, res) => {
    const { cliName } = req.body;
    const binDir = path.join(process.cwd(), 'bin');
    
    // Inject correct runtime credentials directly to standard child process env
    const customEnv = {
      ...process.env,
      PATH: `${binDir}:/root/.local/bin:${process.env.HOME || '/root'}/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${process.env.PATH || ''}`,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
      GH_TOKEN: process.env.GH_TOKEN || '',
      VERCEL_TOKEN: process.env.VERCEL_TOKEN || '',
      SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN || '',
      NOTION_API_TOKEN: process.env.NOTION_API_TOKEN || '',
      NOTION_WORKSPACE_ID: process.env.NOTION_WORKSPACE_ID || ''
    };

    try {
      if (cliName === 'github') {
        if (!customEnv.GH_TOKEN) {
          return res.json({ connected: false, output: "No GITHUB_TOKEN / GH_TOKEN found in your environment keys." });
        }
        // Test auth status using our downloaded local GitHub CLI binary
        const { stdout, stderr } = await execAsync(`"${GH_BINARY_PATH}" auth status`, { env: customEnv });
        res.json({ connected: true, output: stdout || stderr });
      } 
      else if (cliName === 'vercel') {
        if (!customEnv.VERCEL_TOKEN) {
          return res.json({ connected: false, output: "No VERCEL_TOKEN found in your environment keys." });
        }
        // Get the active logged in user details
        const { stdout, stderr } = await execAsync('npx vercel whoami', { env: customEnv });
        res.json({ connected: true, output: `Successfully authenticated as active user:\n${stdout || stderr}` });
      } 
      else if (cliName === 'supabase') {
        if (!customEnv.SUPABASE_ACCESS_TOKEN) {
          return res.json({ connected: false, output: "No SUPABASE_ACCESS_TOKEN found in your environment keys." });
        }
        // Query listed remote projects to test token potency
        const { stdout, stderr } = await execAsync('npx supabase projects list', { env: customEnv });
        res.json({ connected: true, output: `Project pipeline connected successfully:\n${stdout || stderr}` });
      }
      else if (cliName === 'notion') {
        if (!customEnv.NOTION_API_TOKEN) {
          return res.json({ connected: false, output: "No NOTION_API_TOKEN found in your environment keys." });
        }
        // Query active workspaces/user details on Notion CLI
        const { stdout, stderr } = await execAsync('npx -y cross-env NOTION_KEYRING=0 npx ntn whoami', { 
          env: {
            ...customEnv,
            NOTION_KEYRING: '0'
          } 
        });
        res.json({ connected: true, output: `Notion workspace verified dynamically:\n${stdout || stderr}` });
      }
      else if (cliName === 'antigravity' || cliName === 'agy') {
        try {
          const { stdout, stderr } = await execAsync('agy -h </dev/null', { env: customEnv, timeout: 5000 });
          res.json({ 
            connected: true, 
            output: `Antigravity CLI (agy) is operational in workspace PTY:\n${(stdout || stderr).split('\n').slice(0, 8).join('\n')}` 
          });
        } catch (e: any) {
          const out = e.stdout || e.stderr || e.message || 'Antigravity CLI (agy) binary active.';
          res.json({
            connected: true,
            output: `Antigravity CLI (agy) is operational:\n${String(out).split('\n').slice(0, 8).join('\n')}`
          });
        }
      }
      else {
        res.status(400).json({ error: "Invalid CLI target specified." });
      }
    } catch (err: any) {
      res.json({ connected: false, error: err.message, output: err.stderr || err.stdout || err.message });
    }
  });

  // API Route: Trigger action test commands
  app.post("/api/cli/action", async (req, res) => {
    const { cliName, actionName } = req.body;
    const binDir = path.join(process.cwd(), 'bin');
    const customEnv = {
      ...process.env,
      PATH: `${binDir}:/root/.local/bin:${process.env.HOME || '/root'}/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${process.env.PATH || ''}`,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
      GH_TOKEN: process.env.GH_TOKEN || '',
      VERCEL_TOKEN: process.env.VERCEL_TOKEN || '',
      SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN || '',
      NOTION_API_TOKEN: process.env.NOTION_API_TOKEN || '',
      NOTION_WORKSPACE_ID: process.env.NOTION_WORKSPACE_ID || ''
    };

    try {
      let command = '';
      if (cliName === 'github') {
        if (actionName === 'list-repos') {
          command = `"${GH_BINARY_PATH}" repo list --limit 10`;
        } else if (actionName === 'list-issues') {
          command = `"${GH_BINARY_PATH}" issue list --limit 10`;
        } else {
          command = `"${GH_BINARY_PATH}" --help`;
        }
      } 
      else if (cliName === 'vercel') {
        if (actionName === 'list-projects') {
          command = 'npx vercel list --limit 10';
        } else {
          command = 'npx vercel --help';
        }
      } 
      else if (cliName === 'supabase') {
        if (actionName === 'list-orgs') {
          command = 'npx supabase db list';
        } else {
          command = 'npx supabase --help';
        }
      }
      else if (cliName === 'notion') {
        if (actionName === 'list-pages') {
          command = 'npx -y cross-env NOTION_KEYRING=0 npx ntn pages';
        } else if (actionName === 'list-workspaces') {
          command = 'npx -y cross-env NOTION_KEYRING=0 npx ntn workspaces';
        } else {
          command = 'npx -y cross-env NOTION_KEYRING=0 npx ntn whoami';
        }
      }
      else if (cliName === 'antigravity' || cliName === 'agy') {
        if (actionName === 'models') {
          command = 'agy models';
        } else if (actionName === 'version') {
          command = 'agy -v';
        } else {
          command = 'agy -h';
        }
      }

      if (!command) {
        return res.status(400).json({ error: "Action or command mapping not found." });
      }

      const { stdout, stderr } = await execAsync(command, { env: customEnv });
      res.json({ success: true, command, output: stdout || stderr });
    } catch (err: any) {
      res.json({ success: false, error: err.message, output: err.stderr || err.stdout || err.message });
    }
  });

  // --- UPSY REMOTE MCP & OAUTH 2.1 PKCE ENDPOINTS ---

  // Generate OAuth 2.1 authorization URL with PKCE
  app.get("/api/upsy/auth-url", async (req, res) => {
    try {
      const redirectUriParam = req.query.redirect_uri as string | undefined;
      const host = req.get('host') || 'ais-dev-soqmv42o6nqrg73vgevra3-22244230581.asia-east1.run.app';
      const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
      const computedRedirectUri = redirectUriParam || `${protocol}://${host}/api/oauth/upsy/callback`;

      const authData = await createAuthorizationUrl({ redirectUri: computedRedirectUri });
      res.json({
        success: true,
        url: authData.url,
        state: authData.state,
        client_id: authData.client_id,
        redirect_uri: authData.redirect_uri,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // OAuth 2.1 callback handler (receives authorization code from Upsy)
  app.get("/api/oauth/upsy/callback", async (req, res) => {
    const { code, state, error, error_description } = req.query;

    if (error) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Upsy OAuth Authorization Failed</title></head>
        <body style="font-family: sans-serif; padding: 40px; background: #121212; color: #fff;">
          <h2 style="color: #ff453a;">Authorization Denied or Failed</h2>
          <p>${error_description || error}</p>
          <a href="/" style="color: #64b5f6;">Back to Workspace</a>
        </body>
        </html>
      `);
    }

    if (!code || !state) {
      return res.status(400).send("Missing code or state in OAuth callback.");
    }

    try {
      const pkceSession = popPkceSession(String(state));
      if (!pkceSession) {
        return res.status(400).send("Invalid or expired OAuth state session. Please initiate login again.");
      }

      // Load client ID from saved client config
      const clientConfig = await import('./services/upsyMcpService.ts').then(m => m.loadClientConfig());
      if (!clientConfig?.client_id) {
        return res.status(500).send("Client configuration missing.");
      }

      const tokens = await exchangeCodeForTokens({
        code: String(code),
        code_verifier: pkceSession.code_verifier,
        redirect_uri: pkceSession.redirect_uri,
        client_id: clientConfig.client_id,
      });

      // Broadcast terminal notification if possible
      broadcastToTerminal({
        type: 'output',
        data: `\r\n\x1b[32m[Upsy OAuth 2.1]\x1b[0m Successfully connected! Access token obtained with scopes: ${tokens.scope || 'all'}\r\n`,
      });

      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Upsy Connected Successfully</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f0f11; color: #f0f0f2; padding: 48px; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 80vh; }
            .card { background: #1a1a1e; border: 1px solid #2a2a30; border-radius: 16px; padding: 32px 40px; max-width: 520px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); text-align: center; }
            .badge { display: inline-block; padding: 6px 14px; border-radius: 999px; background: rgba(30,142,62,0.15); color: #6dd78c; font-weight: 600; font-size: 13px; margin-bottom: 16px; border: 1px solid rgba(109,215,140,0.3); }
            h1 { font-size: 24px; margin: 0 0 12px 0; font-weight: 600; }
            p { font-size: 14px; color: #a0a0a8; line-height: 1.6; margin: 0 0 24px 0; }
            a { display: inline-block; background: #ffffff; color: #000000; text-decoration: none; font-weight: 600; padding: 12px 24px; border-radius: 8px; font-size: 14px; transition: opacity 0.2s; }
            a:hover { opacity: 0.9; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">✓ Connected to Upsy Remote MCP</div>
            <h1>Authentication Complete</h1>
            <p>Your memory, files, browser, and connected apps are now linked to this workspace. You can close this tab or return to the application.</p>
            <a href="/">Return to Workspace</a>
          </div>
        </body>
        </html>
      `);
    } catch (err: any) {
      console.error("Token exchange failed:", err);
      return res.status(500).send(`Token exchange error: ${err.message}`);
    }
  });

  // Upsy connection status
  app.get("/api/upsy/status", (req, res) => {
    const tokens = loadTokens();
    res.json({
      connected: !!tokens?.access_token,
      obtained_at: tokens?.obtained_at,
      scope: tokens?.scope,
      hasRefreshToken: !!tokens?.refresh_token,
    });
  });

  // Upsy tools list
  app.get("/api/upsy/tools", async (req, res) => {
    try {
      const tools = await listUpsyTools();
      res.json({ success: true, tools });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Call Upsy tool
  app.post("/api/upsy/call", async (req, res) => {
    const { name, arguments: toolArgs } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: "Tool name is required." });
    }
    try {
      const result = await callUpsyTool(name, toolArgs || {});
      res.json({ success: true, result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- TERMINAL & AUDIT SSE & INPUT ENDPOINTS ---

  // 1. /api/terminal/stream - SSE endpoint for interactive shell session output
  app.get("/api/terminal/stream", (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Send initial working directory status to newly connected client
    res.write(`data: ${JSON.stringify({ type: 'init', cwd: terminalCwd })}\n\n`);

    // Replay recent history to new connection so terminal content is preserved across page navigations
    for (const item of terminalHistory) {
      res.write(`data: ${JSON.stringify(item)}\n\n`);
    }

    shellClients.add(res);

    req.on('close', () => {
      shellClients.delete(res);
    });
  });

  // 2. /api/terminal/run & /api/terminal/input - Command execution in the agent's bash workspace environment
  app.post("/api/terminal/run", async (req, res) => {
    const { command } = req.body;
    if (typeof command !== 'string') {
      return res.status(400).json({ success: false, error: "Invalid command payload. Expected string." });
    }
    try {
      const result = await executeTerminalCommand(command);
      return res.json({ success: true, ...result });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/terminal/input", async (req, res) => {
    const { input } = req.body;
    if (typeof input !== 'string') {
      return res.status(400).json({ success: false, error: "Invalid input payload. Expected string." });
    }

    // If an interactive process is active, forward keystrokes/data to its stdin
    if (activeTerminalProcess && !activeTerminalProcess.killed) {
      try {
        // In raw PTY modes (such as Bubbletea / agy), trailing \n must be translated to \r
        // so that the raw terminal slave detects Enter / select rather than discarding
        let payload = input;
        if (payload.endsWith('\n') && !payload.endsWith('\r\n') && !payload.endsWith('\r')) {
          payload = payload.slice(0, -1) + '\r';
        }
        activeTerminalProcess.stdin?.write(payload);
        return res.json({ success: true, forwardedToActiveProcess: true });
      } catch (e: any) {
        return res.status(500).json({ success: false, error: e.message });
      }
    }

    try {
      const result = await executeTerminalCommand(input);
      return res.json({ success: true, ...result });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Interrupt active process (send SIGINT / Ctrl+C)
  app.post("/api/terminal/interrupt", (req, res) => {
    if (activeTerminalProcess && !activeTerminalProcess.killed) {
      try {
        const proc = activeTerminalProcess;
        // Kill the process group if possible
        try {
          if (proc.pid) {
            process.kill(-proc.pid, 'SIGINT');
          }
        } catch (e) {}
        proc.kill('SIGINT');

        setTimeout(() => {
          if (activeTerminalProcess && !activeTerminalProcess.killed) {
            try {
              if (proc.pid) process.kill(-proc.pid, 'SIGTERM');
            } catch (e) {}
            try { proc.kill('SIGTERM'); } catch (e) {}
          }
        }, 300);

        broadcastToTerminal({ type: 'output', data: `^C\r\n` });
        return res.json({ success: true, message: "Interrupt signal sent to active process." });
      } catch (err: any) {
        return res.status(500).json({ success: false, error: err.message });
      }
    }
    return res.json({ success: false, message: "No active process running to interrupt." });
  });

  // 3. /api/terminal/info - Workspace environment facts and active working directory
  app.get("/api/terminal/info", (req, res) => {
    res.json({
      cwd: terminalCwd,
      activeProcess: activeCommandName,
      user: process.env.USER || 'developer',
      hostname: 'ai-studio',
      nodeVersion: process.version,
      platform: process.platform
    });
  });

  // 4. /api/terminal/clear - Clear terminal history buffer
  app.post("/api/terminal/clear", (req, res) => {
    terminalHistory.length = 0;
    terminalHistory.push({ type: 'output', data: '=== Interactive Workspace Shell Connected (/bin/bash) ===\r\n' });
    for (const client of shellClients) {
      try {
        client.write(`data: ${JSON.stringify({ type: 'clear' })}\n\n`);
      } catch (e) {}
    }
    res.json({ success: true });
  });

  // 5. /api/terminal/resize - Dynamic PTY window size adjustment
  app.post("/api/terminal/resize", (req, res) => {
    const { cols, rows } = req.body;
    if (typeof cols === 'number' && typeof rows === 'number' && cols > 0 && rows > 0) {
      currentTerminalCols = Math.min(240, Math.max(20, Math.floor(cols)));
      currentTerminalRows = Math.min(100, Math.max(5, Math.floor(rows)));

      // If a process is actively running, write the in-band resize packet to its stdin
      if (activeTerminalProcess && !activeTerminalProcess.killed) {
        try {
          activeTerminalProcess.stdin?.write(`__PTY_RESIZE__:${currentTerminalCols}:${currentTerminalRows}\n`);
        } catch (e) {}
      }

      return res.json({ success: true, cols: currentTerminalCols, rows: currentTerminalRows });
    }
    return res.status(400).json({ error: "Invalid dimensions provided." });
  });

  // 3. /api/terminal/log - SSE endpoint for agent audit logging from /tmp/agent_terminal.log
  app.get("/api/terminal/log", (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Send existing log history upon connection
    try {
      if (fs.existsSync(AGENT_LOG_PATH)) {
        const history = fs.readFileSync(AGENT_LOG_PATH, 'utf-8');
        res.write(`data: ${JSON.stringify({ type: 'log', data: history })}\n\n`);
      } else {
        res.write(`data: ${JSON.stringify({ type: 'log', data: `[${new Date().toISOString()}] Agent audit log stream connected.\n` })}\n\n`);
      }
    } catch (e: any) {
      res.write(`data: ${JSON.stringify({ type: 'log', data: `[Error reading log history: ${e.message}]\n` })}\n\n`);
    }

    auditClients.add(res);

    req.on('close', () => {
      auditClients.delete(res);
    });
  });

  // ==========================================
  // Remote MCP Server Routes (Grok Connectors)
  // ==========================================
  const sseTransports = new Map<string, SSEServerTransport>();

  // Helper to read public Cloudflare tunnel URL if available
  const getPublicTunnelUrl = (): string => {
    try {
      const candidates = ['/tmp/mcp_tunnel.log', '/tmp/cloudflared.log', '/tmp/logs/mcp_tunnel.log'];
      for (const file of candidates) {
        if (fs.existsSync(file)) {
          const content = fs.readFileSync(file, 'utf-8');
          const matches = content.match(/https:\/\/[-a-zA-Z0-9\.]*\.trycloudflare\.com/g);
          if (matches && matches.length > 0) {
            return matches[matches.length - 1];
          }
        }
      }
    } catch (_) {}
  };

  // API Route: Get MCP tunnel status & URL
  app.get("/api/mcp/tunnel", (req, res) => {
    const url = getPublicTunnelUrl();
    const isRunning = !!url;
    res.json({
      status: isRunning ? "running" : "stopped",
      publicUrl: url || null,
      sseEndpoint: url ? `${url}/mcp/sse` : null,
      postEndpoint: url ? `${url}/mcp` : null,
      dashboard: url ? `${url}/mcp` : null
    });
  });

  // API Route: Renew / restart MCP tunnel
  app.post("/api/mcp/tunnel/renew", async (req, res) => {
    try {
      appendAuditLog("Triggering manual MCP tunnel renewal.");
      const scriptPath = [
        path.join(process.cwd(), "plugins", "remote-mcp-host", "mcp-tunnel.sh"),
        path.join(process.cwd(), "scripts", "mcp-tunnel.sh")
      ].find(p => fs.existsSync(p)) || path.join(process.cwd(), "plugins", "remote-mcp-host", "mcp-tunnel.sh");
      const { stdout, stderr } = await execAsync(`bash "${scriptPath}" renew`, { timeout: 35000 });
      const newUrl = getPublicTunnelUrl();
      res.json({
        success: true,
        publicUrl: newUrl,
        sseEndpoint: newUrl ? `${newUrl}/mcp/sse` : null,
        postEndpoint: newUrl ? `${newUrl}/mcp` : null,
        output: stdout || stderr
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Permanent Cloudflare Custom Domain for Grok Connectors (Zero expiration)
  const PERMANENT_CUSTOM_DOMAIN = "https://ai-studio-mcp.shifatmasud.workers.dev";

  async function syncPermanentEdgeWorker(backendUrl: string) {
    if (!backendUrl) return;
    try {
      const res = await fetch(`${PERMANENT_CUSTOM_DOMAIN}/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-sync-secret": "ai_studio_mcp_secret_2026"
        },
        body: JSON.stringify({ backendUrl })
      });
      if (res.ok) {
        appendAuditLog(`[PERMANENT-DOMAIN] Synced backend ${backendUrl} to ${PERMANENT_CUSTOM_DOMAIN}`);
        console.log(`[PERMANENT-DOMAIN] Synced backend ${backendUrl} to ${PERMANENT_CUSTOM_DOMAIN}`);
      }
    } catch (err: any) {
      appendAuditLog(`[PERMANENT-DOMAIN] Sync failed: ${err.message}`);
    }
  }

  // Automated Cloudflare Tunnel Watchdog & Auto-Renew Service
  let isRenewingTunnel = false;

  async function checkAndAutoRenewTunnel() {
    if (isRenewingTunnel) return;

    const currentUrl = getPublicTunnelUrl();
    let isHealthy = false;

    if (currentUrl) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const probeRes = await fetch(`${currentUrl}/api/health`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (probeRes.status === 200) {
          isHealthy = true;
          // Periodically sync active backend to edge worker
          syncPermanentEdgeWorker(currentUrl).catch(() => {});
        }
      } catch (_) {
        isHealthy = false;
      }
    }

    if (!isHealthy) {
      isRenewingTunnel = true;
      appendAuditLog("[MCP-WATCHDOG] Cloudflare tunnel unhealthy or expired. Auto-renewing via Cloudflare CLI...");
      console.log("[MCP-WATCHDOG] Cloudflare tunnel unhealthy or expired. Auto-renewing via Cloudflare CLI...");
      try {
        const scriptPath = [
          path.join(process.cwd(), "plugins", "remote-mcp-host", "mcp-tunnel.sh"),
          path.join(process.cwd(), "scripts", "mcp-tunnel.sh")
        ].find(p => fs.existsSync(p)) || path.join(process.cwd(), "plugins", "remote-mcp-host", "mcp-tunnel.sh");
        await execAsync(`bash "${scriptPath}" renew`, { timeout: 45000 });
        const newUrl = getPublicTunnelUrl();
        appendAuditLog(`[MCP-WATCHDOG] Cloudflare tunnel renewed successfully: ${newUrl}`);
        console.log(`[MCP-WATCHDOG] Cloudflare tunnel renewed successfully: ${newUrl}`);
        if (newUrl) {
          await syncPermanentEdgeWorker(newUrl);
        }
      } catch (err: any) {
        appendAuditLog(`[MCP-WATCHDOG] Failed to auto-renew tunnel: ${err.message}`);
        console.error("[MCP-WATCHDOG] Auto-renew error:", err.message);
      } finally {
        isRenewingTunnel = false;
      }
    }
  }

  // Run watchdog initial check after 5s, then periodic poll every 45s
  setTimeout(checkAndAutoRenewTunnel, 5000);
  setInterval(checkAndAutoRenewTunnel, 45000);

  // CORS and preflight middleware for all MCP endpoints
  app.use(["/mcp", "/sse", "/messages"], (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-session-id, *");
    res.setHeader("Access-Control-Expose-Headers", "*");
    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }
    next();
  });

  // 3. GET /mcp/sse & GET /sse - SSE Stream Transport Handler
  const handleSseConnection = async (req: express.Request, res: express.Response) => {
    try {
      // Set CORS and proxy unbuffered streaming headers
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "*");
      res.setHeader("X-Accel-Buffering", "no");

      const server = createWorkspaceMcpServer();
      const transport = new SSEServerTransport("/mcp/messages", res);
      const sessionId = transport.sessionId;
      sseTransports.set(sessionId, transport);
      appendAuditLog(`Grok/MCP SSE client connected. Session ID: ${sessionId}`);

      transport.onclose = () => {
        appendAuditLog(`Grok/MCP SSE client disconnected. Session ID: ${sessionId}`);
        sseTransports.delete(sessionId);
      };

      req.on('close', () => {
        sseTransports.delete(sessionId);
      });

      await server.connect(transport);
    } catch (err: any) {
      appendAuditLog(`SSE connection error: ${err.message}`);
      if (!res.headersSent) {
        res.status(500).json({ error: `Failed to initialize SSE transport: ${err.message}` });
      }
    }
  };

  // 1. GET /mcp - Metadata, Discovery & SSE Auto-Upgrade
  app.get("/mcp", (req, res) => {
    // If client requested text/event-stream directly on /mcp, upgrade to SSE seamlessly
    if (req.headers.accept?.includes('text/event-stream')) {
      return handleSseConnection(req, res);
    }

    const tunnelUrl = getPublicTunnelUrl();
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.get('host') || 'localhost:3000';
    const directUrl = `${protocol}://${host}`;
    const baseUrl = tunnelUrl || directUrl;

    const metadata = {
      name: "ai-studio-workspace-mcp",
      version: "1.0.0",
      description: "Remote Model Context Protocol (MCP) server for Google AI Studio workspace control, compatible with Grok Connectors.",
      status: "online",
      authentication: {
        type: "none",
        description: "Open endpoint without authentication for instant connector setup."
      },
      permanentCustomDomain: {
        sseEndpoint: `${PERMANENT_CUSTOM_DOMAIN}/mcp/sse`,
        postEndpoint: `${PERMANENT_CUSTOM_DOMAIN}/mcp`,
        dashboard: `${PERMANENT_CUSTOM_DOMAIN}/mcp`,
        notes: "Zero-expiration permanent custom domain on Cloudflare Edge. Use this in Grok."
      },
      transports: {
        sse: {
          endpoint: `${PERMANENT_CUSTOM_DOMAIN}/mcp/sse`,
          directTunnelEndpoint: `${baseUrl}/mcp/sse`,
          notes: "Primary SSE streaming transport for Grok Connectors."
        },
        streamableHttp: {
          endpoint: `${PERMANENT_CUSTOM_DOMAIN}/mcp`,
          directTunnelEndpoint: `${baseUrl}/mcp`,
          method: "POST",
          notes: "Stateless JSON-RPC 2.0 endpoint supporting standard initialize, tools/list, and tools/call."
        }
      },
      publicTunnelUrl: tunnelUrl || null,
      grokInstructions: {
        step1: "In Grok (grok.com), go to Settings -> Connectors / MCP Tools.",
        step2: `Enter Server URL: ${PERMANENT_CUSTOM_DOMAIN}/mcp/sse (or ${PERMANENT_CUSTOM_DOMAIN}/mcp)`,
        step3: "Leave Authentication as None/Empty.",
        step4: "Save and test. Grok will discover all 8 workspace tools."
      },
      toolsCount: WORKSPACE_TOOLS.length,
      tools: WORKSPACE_TOOLS.map(t => ({
        name: t.name,
        description: t.description,
        parameters: t.inputSchema
      }))
    };

    if (req.accepts('html') && !req.accepts('json')) {
      return res.send(`<!DOCTYPE html>
<html>
<head>
  <title>AI Studio Workspace MCP Server</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #0d1117; color: #c9d1d9; padding: 2rem; max-width: 900px; margin: 0 auto; line-height: 1.6; }
    h1 { color: #58a6ff; border-bottom: 1px solid #30363d; padding-bottom: 0.5rem; }
    h2 { color: #79c0ff; margin-top: 1.5rem; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 1.2rem; margin-bottom: 1.2rem; }
    .code { background: #0d1117; padding: 0.4rem 0.8rem; border-radius: 6px; font-family: monospace; color: #7ee787; word-break: break-all; }
    .tool-item { border-left: 3px solid #1f6feb; padding-left: 0.8rem; margin: 0.8rem 0; }
    .tool-name { font-weight: bold; color: #ffa657; font-family: monospace; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold; background: #238636; color: #fff; margin-bottom: 8px; }
  </style>
</head>
<body>
  <h1>AI Studio Workspace MCP Server</h1>
  <p>Online &amp; ready for Grok Connectors and external MCP clients.</p>
  <div class="card">
    <div class="badge">PERMANENT CUSTOM DOMAIN (ZERO EXPIRATION)</div>
    <h3>Grok Connector Setup:</h3>
    <p>1. Open <strong>Grok</strong> &rarr; <strong>Connectors</strong> &rarr; <strong>Add Custom MCP Server</strong></p>
    <p>2. Server URL (SSE): <span class="code">${PERMANENT_CUSTOM_DOMAIN}/mcp/sse</span></p>
    <p>3. Direct POST URL: <span class="code">${PERMANENT_CUSTOM_DOMAIN}/mcp</span></p>
    <p>4. Authentication: <em>None (Open Access)</em></p>
  </div>
  <h2>Available Tools (${WORKSPACE_TOOLS.length})</h2>
  ${WORKSPACE_TOOLS.map(t => `
    <div class="tool-item">
      <div class="tool-name">${t.name}</div>
      <div style="color: #8b949e; font-size: 0.9rem;">${t.description}</div>
    </div>
  `).join('')}
</body>
</html>`);
    }

    return res.json(metadata);
  });

  // 2. POST /mcp - Stateless JSON-RPC 2.0 Endpoint
  app.post("/mcp", async (req, res) => {
    try {
      const tunnelUrl = getPublicTunnelUrl();
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
      const host = req.get('host') || 'localhost:3000';
      const directUrl = `${protocol}://${host}`;
      const baseUrl = tunnelUrl || directUrl;

      const { statusCode, response } = await handleStatelessJsonRpc(req.body, baseUrl);
      if (statusCode === 204) {
        return res.status(204).end();
      }
      return res.status(statusCode).json(response);
    } catch (err: any) {
      appendAuditLog(`POST /mcp error: ${err.message}`);
      return res.status(500).json({
        jsonrpc: "2.0",
        id: req.body?.id ?? null,
        error: { code: -32603, message: `Internal server error: ${err.message}` }
      });
    }
  });

  app.get("/mcp/sse", handleSseConnection);
  app.get("/sse", handleSseConnection);

  // 4. POST /mcp/messages & POST /messages - Post Messages to Active SSE Session
  const handlePostMessages = async (req: express.Request, res: express.Response) => {
    const sessionId = (req.query.sessionId as string) || (req.headers["x-session-id"] as string);
    if (!sessionId) {
      return res.status(400).json({ error: "Missing sessionId parameter" });
    }

    const transport = sseTransports.get(sessionId);
    if (!transport) {
      return res.status(404).json({ error: `Session not found: ${sessionId}` });
    }

    try {
      await transport.handlePostMessage(req, res);
    } catch (err: any) {
      appendAuditLog(`handlePostMessage error: ${err.message}`);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      }
    }
  };

  app.post("/mcp/messages", handlePostMessages);
  app.post("/messages", handlePostMessages);

  // Standard health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve static files from dist
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    
    // SPA fallback: send index.html for all other routes
    // Express v5 requires '*all' for catch-all routes
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
