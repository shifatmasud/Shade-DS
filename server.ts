import express from "express";
import path from "path";
import { fileURLToPath } from 'url';
import { exec, execSync, spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import https from "https";
import dotenv from "dotenv";

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

const GH_BINARY_PATH = path.join(process.cwd(), 'bin', 'gh');
const AGENT_LOG_PATH = '/tmp/agent_terminal.log';

// Ensure /tmp/agent_terminal.log exists with initial content if missing
try {
  if (!fs.existsSync(AGENT_LOG_PATH)) {
    fs.writeFileSync(AGENT_LOG_PATH, `[${new Date().toISOString()}] Agent Terminal Audit Log Initialized.\n`, 'utf-8');
  }
} catch (e) {
  console.error("Failed to initialize /tmp/agent_terminal.log:", e);
}

// Global Terminal State & SSE Client Management (Same environment as AI agent)
let terminalCwd = process.cwd();
const shellClients: Set<any> = new Set();
const auditClients: Set<any> = new Set();
const terminalHistory: Array<{ type: string; data: string; cwd?: string }> = [
  { type: 'output', data: '=== Interactive Workspace Shell Connected (/bin/bash) ===\r\n' }
];

function broadcastToTerminal(payload: { type: string; data: string; cwd?: string }) {
  terminalHistory.push(payload);
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

    const customEnv = {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      PATH: `${process.env.PATH || ''}:/usr/local/bin:/usr/bin:/bin`,
      PAGER: 'cat',
      GH_TOKEN: process.env.GH_TOKEN || '',
      VERCEL_TOKEN: process.env.VERCEL_TOKEN || '',
      SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN || '',
      NOTION_API_TOKEN: process.env.NOTION_API_TOKEN || '',
      NOTION_WORKSPACE_ID: process.env.NOTION_WORKSPACE_ID || ''
    };

    const proc = spawn('/bin/bash', ['-c', script], {
      cwd: terminalCwd,
      env: customEnv
    });

    let rawStdout = '';
    let rawStderr = '';

    proc.stdout.on('data', (data) => {
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

    proc.stderr.on('data', (data) => {
      const text = data.toString();
      rawStderr += text;
      broadcastToTerminal({ type: 'output', data: text });
    });

    proc.on('close', (code) => {
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
        cwd: terminalCwd
      });

      resolve({
        stdout: rawStdout.split(sentinel)[0] || '',
        stderr: rawStderr,
        exitCode,
        cwd: terminalCwd
      });
    });

    proc.on('error', (err) => {
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

async function startServer() {
  // Pre-download and setup official GitHub CLI binary if needed
  downloadGithubCliIfNotExists().catch(console.error);

  const app = express();
  const PORT = 3000;

  // Track the express parser
  app.use(express.json());

  // API Route: Check tokens configuration status
  app.get("/api/cli/config", (req, res) => {
    res.json({
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
    const { ghToken, vercelToken, supabaseAccessToken, notionApiToken, notionWorkspaceId } = req.body;

    try {
      let lines: string[] = [];
      if (fs.existsSync(ENV_PATH)) {
        const current = fs.readFileSync(ENV_PATH, 'utf-8');
        lines = current.split('\n');
      }

      const keys = {
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
    
    // Inject correct runtime credentials directly to standard child process env
    const customEnv = {
      ...process.env,
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
    const customEnv = {
      ...process.env,
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

      if (!command) {
        return res.status(400).json({ error: "Action or command mapping not found." });
      }

      const { stdout, stderr } = await execAsync(command, { env: customEnv });
      res.json({ success: true, command, output: stdout || stderr });
    } catch (err: any) {
      res.json({ success: false, error: err.message, output: err.stderr || err.stdout || err.message });
    }
  });

  // --- TERMINAL & AUDIT SSE & INPUT ENDPOINTS ---

  // 1. /api/terminal/stream - SSE endpoint for interactive shell session output
  app.get("/api/terminal/stream", (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

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
    try {
      const result = await executeTerminalCommand(input);
      return res.json({ success: true, ...result });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. /api/terminal/info - Workspace environment facts and active working directory
  app.get("/api/terminal/info", (req, res) => {
    res.json({
      cwd: terminalCwd,
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
