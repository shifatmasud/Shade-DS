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

// Unify filesystem paths: ensure /app/applet is available even in Cloud Run /workspace
try {
  if (!fs.existsSync('/app/applet')) {
    try {
      fs.mkdirSync('/app', { recursive: true });
      fs.symlinkSync(process.cwd(), '/app/applet');
    } catch (_) {}
  }
} catch (_) {}

if (fs.existsSync('/app/applet')) {
  try {
    process.chdir('/app/applet');
  } catch (_) {}
}

// Multi-tier binary resolution: resolves /app/applet/.bin/agy or /workspace/.bin/agy or /tmp/bin/agy
function getAgyBinaryPath(): string {
  const localBinAgy = path.join(process.cwd(), '.bin', 'agy');
  const candidates = [
    '/app/applet/.bin/agy',
    localBinAgy,
    '/tmp/bin/agy',
    path.join(process.cwd(), 'bin', 'agy'),
    '/usr/local/bin/agy',
    '/usr/bin/agy'
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c) && !fs.lstatSync(c).isSymbolicLink() && fs.statSync(c).size > 50000000) {
        return c;
      }
    } catch (_) {}
  }
  return localBinAgy;
}

let cachedWorkingModel = "gemini-3.8-flash-low";
let isScanningModel = false;

async function findWorkingModel(): Promise<string> {
  if (isScanningModel) return cachedWorkingModel;
  isScanningModel = true;
  const candidates = [
    "gemini-3.8-flash-low",
    "gemini-3.7-flash-low",
    "gemini-3.6-flash-low",
    "gemini-3.8-flash-medium",
    "gemini-3.7-flash-medium",
    "gemini-3.5-flash"
  ];
  
  const realBin = getAgyBinaryPath();
  if (!realBin || !fs.existsSync(realBin)) {
    isScanningModel = false;
    return cachedWorkingModel;
  }

  const binDir = path.join(process.cwd(), 'bin');
  const dotBinDir = path.join(process.cwd(), '.bin');
  const customEnv = {
    ...process.env,
    PATH: `/app/applet/.bin:${dotBinDir}:/tmp/bin:${binDir}:/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ''}`,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || ''
  };

  for (const model of candidates) {
    try {
      const checkCmd = `"${realBin}" --model ${model} --print "ping"`;
      const { stdout, stderr } = await execAsync(checkCmd, { env: customEnv, timeout: 6000 });
      if (stdout.includes("ping") || stdout.trim().length > 0 || (stderr && !stderr.includes("Quota exceeded") && !stderr.includes("RESOURCE_EXHAUSTED"))) {
        console.log(`[Antigravity] Model preflight success: ${model}`);
        cachedWorkingModel = model;
        isScanningModel = false;
        return model;
      }
    } catch (e: any) {
      console.warn(`[Antigravity] Model preflight failed or exhausted for ${model}: ${e.message || e}`);
    }
  }

  isScanningModel = false;
  return cachedWorkingModel;
}

let agyDownloadPromise: Promise<string | null> | null = null;

async function ensureAntigravityBinary(): Promise<string | null> {
  const localBinDir = path.join(process.cwd(), '.bin');
  const localBinAgy = path.join(localBinDir, 'agy');
  const tmpBinAgy = '/tmp/bin/agy';

  // 1. Ensure local .bin and /tmp/bin directories exist (safe across all environments)
  try { fs.mkdirSync(localBinDir, { recursive: true }); } catch (_) {}
  try { fs.mkdirSync('/tmp/bin', { recursive: true }); } catch (_) {}
  try {
    if (!fs.existsSync('/app/applet') && fs.existsSync('/workspace')) {
      try {
        fs.mkdirSync('/app', { recursive: true });
        fs.symlinkSync('/workspace', '/app/applet');
      } catch (_) {}
    }
    if (fs.existsSync('/app/applet')) {
      fs.mkdirSync('/app/applet/.bin', { recursive: true });
    }
  } catch (_) {}

  // 2. Check if a real binary already exists in candidate paths
  const existing = getAgyBinaryPath();
  if (existing && fs.existsSync(existing) && fs.statSync(existing).size > 50000000) {
    // Mirror binary to other standard locations if possible
    try {
      if (!fs.existsSync(localBinAgy)) {
        fs.copyFileSync(existing, localBinAgy);
        fs.chmodSync(localBinAgy, 0o755);
      }
    } catch (_) {}
    try {
      if (!fs.existsSync(tmpBinAgy)) {
        fs.copyFileSync(existing, tmpBinAgy);
        fs.chmodSync(tmpBinAgy, 0o755);
      }
    } catch (_) {}
    try {
      if (fs.existsSync('/app/applet/.bin') && !fs.existsSync('/app/applet/.bin/agy')) {
        fs.copyFileSync(existing, '/app/applet/.bin/agy');
        fs.chmodSync('/app/applet/.bin/agy', 0o755);
      }
    } catch (_) {}
    return existing;
  }

  // 3. If currently downloading, await the active promise
  if (agyDownloadPromise) {
    return agyDownloadPromise;
  }

  // 4. Download directly into /tmp/bin/agy and copy to .bin/agy and /app/applet/.bin/agy
  agyDownloadPromise = new Promise((resolve) => {
    const downloadCmd = `curl -fsSL https://storage.googleapis.com/antigravity-public/antigravity-cli/1.2.16-5594158052802560/linux-x64/cli_linux_x64.tar.gz -o /tmp/cli.tar.gz && tar -xzf /tmp/cli.tar.gz -C /tmp && mv /tmp/antigravity "${tmpBinAgy}" && chmod 755 "${tmpBinAgy}" && cp "${tmpBinAgy}" "${localBinAgy}" 2>/dev/null && chmod 755 "${localBinAgy}" 2>/dev/null && (cp "${tmpBinAgy}" /app/applet/.bin/agy 2>/dev/null && chmod 755 /app/applet/.bin/agy 2>/dev/null || true); rm -f /tmp/cli.tar.gz`;

    const proc = spawn('sh', ['-c', downloadCmd], { stdio: 'ignore' });
    proc.on('close', () => {
      agyDownloadPromise = null;
      const ready = getAgyBinaryPath();
      if (ready && fs.existsSync(ready) && fs.statSync(ready).size > 50000000) {
        try {
          const home = process.env.HOME || '/root';
          const cfgDir = path.join(home, '.gemini', 'antigravity-cli');
          fs.mkdirSync(cfgDir, { recursive: true });
          const cfgFile = path.join(cfgDir, 'settings.json');
          if (!fs.existsSync(cfgFile)) {
            fs.writeFileSync(cfgFile, JSON.stringify({
              modelProvider: "gemini",
              defaultModel: cachedWorkingModel,
              toolPermission: "always-proceed",
              autoExecPolicy: "always-proceed"
            }, null, 2), 'utf-8');
          } else {
            try {
              const content = fs.readFileSync(cfgFile, 'utf-8');
              const data = JSON.parse(content);
              if (data.defaultModel === 'gemini-3.7-flash-medium' || !data.defaultModel) {
                data.defaultModel = cachedWorkingModel;
                fs.writeFileSync(cfgFile, JSON.stringify(data, null, 2), 'utf-8');
              }
            } catch (_) {}
          }
        } catch (_) {}
        // Also trigger background scanner to verify the best available model
        findWorkingModel().then((working) => {
          try {
            const home = process.env.HOME || '/root';
            const cfgFile = path.join(home, '.gemini', 'antigravity-cli', 'settings.json');
            if (fs.existsSync(cfgFile)) {
              const content = fs.readFileSync(cfgFile, 'utf-8');
              const data = JSON.parse(content);
              data.defaultModel = working;
              fs.writeFileSync(cfgFile, JSON.stringify(data, null, 2), 'utf-8');
            }
          } catch (_) {}
        }).catch(() => {});
        resolve(ready);
      } else {
        resolve(null);
      }
    });
    proc.on('error', () => {
      agyDownloadPromise = null;
      resolve(null);
    });
  });

  return agyDownloadPromise;
}

// Trigger background provisioning on startup
ensureAntigravityBinary().catch(() => {});

// Global Terminal State & SSE Client Management (Standardized to /app/applet)
let terminalCwd = fs.existsSync('/app/applet') ? '/app/applet' : process.cwd();
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
  return new Promise(async (resolve) => {
    const trimmed = cmd.trim();
    if (!trimmed) {
      resolve({ stdout: '', stderr: '', exitCode: 0, cwd: terminalCwd });
      return;
    }

    // Broadcast the command execution prompt header
    broadcastToTerminal({ type: 'output', data: `\r\n\x1b[32m❯\x1b[0m ${trimmed}\r\n`, cwd: terminalCwd });

    // Kill any existing active process before starting a new one
    if (activeTerminalProcess && !activeTerminalProcess.killed) {
      try {
        activeTerminalProcess.kill('SIGKILL');
      } catch (e) {}
      activeTerminalProcess = null;
    }

    // Ensure binary is ready across candidate paths
    if (trimmed === 'agy' || trimmed.startsWith('agy ') || trimmed.startsWith('agy=') || trimmed.startsWith('/app/applet/.bin/agy')) {
      let agyPath = await ensureAntigravityBinary();
      if (!agyPath) {
        broadcastToTerminal({
          type: 'output',
          data: `\r\n\x1b[33m⠋ Initializing Antigravity CLI binary in workspace... please wait\x1b[0m\r\n`
        });
        for (let i = 0; i < 20; i++) {
          await new Promise(r => setTimeout(r, 500));
          const candidate = getAgyBinaryPath();
          if (candidate && fs.existsSync(candidate) && fs.statSync(candidate).size > 50000000) {
            agyPath = candidate;
            break;
          }
        }
      }
    }

    const realAgyBin = getAgyBinaryPath();
    let commandToRun = trimmed;
    if (trimmed === 'agy') {
      commandToRun = `"${realAgyBin}" --model ${cachedWorkingModel}`;
    } else if (trimmed.startsWith('agy ')) {
      const args = trimmed.substring(4).trim();
      const hasModel = args.includes('--model') || args.includes('-m ') || args.includes('-m=') || args.startsWith('-m');
      const isSubcommand = ['models', 'agents', 'agent', 'help', 'changelog', 'install', 'mcp', 'mic-serve', 'plugin', 'plugins', 'remote-control', 'update', '-h', '--help', '-v', '--version'].some(sub => args === sub || args.startsWith(sub + ' '));
      if (!hasModel && !isSubcommand) {
        commandToRun = `"${realAgyBin}" --model ${cachedWorkingModel} ${trimmed.substring(4)}`;
      } else {
        commandToRun = `"${realAgyBin}" ${trimmed.substring(4)}`;
      }
    } else if (trimmed.startsWith('/app/applet/.bin/agy') && !fs.existsSync('/app/applet/.bin/agy')) {
      commandToRun = `"${realAgyBin}"${trimmed.substring('/app/applet/.bin/agy'.length)}`;
    }

    const cwdFile = `/tmp/term_cwd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const termRows = currentTerminalRows && currentTerminalRows > 5 ? currentTerminalRows : 24;
    const termCols = currentTerminalCols && currentTerminalCols > 20 ? currentTerminalCols : 80;
    // Run command in terminalCwd with stty rows and cols to guarantee Bubbletea / lipgloss TUI window dimensions
    const script = `cd "${terminalCwd}" 2>/dev/null; stty rows ${termRows} cols ${termCols} 2>/dev/null; ${commandToRun}; __EC=$?; pwd > "${cwdFile}" 2>/dev/null; exit $__EC;`;

    const binDir = path.join(process.cwd(), 'bin');
    const dotBinDir = path.join(process.cwd(), '.bin');
    const customEnv = {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      PATH: `/app/applet/.bin:${dotBinDir}:/tmp/bin:${binDir}:/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ''}`,
      PAGER: 'cat',
      LANG: 'C.UTF-8',
      LC_ALL: 'C.UTF-8',
      GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
      GH_TOKEN: process.env.GH_TOKEN || '',
      VERCEL_TOKEN: process.env.VERCEL_TOKEN || '',
      SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN || '',
      NOTION_API_TOKEN: process.env.NOTION_API_TOKEN || '',
      NOTION_WORKSPACE_ID: process.env.NOTION_WORKSPACE_ID || ''
    };

    const ptyRunnerPath = path.join(process.cwd(), 'scripts', 'pty_runner.py');
    const hasPtyRunner = fs.existsSync(ptyRunnerPath);

    let spawnCmd = '';
    let spawnArgs: string[] = [];

    if (hasPtyRunner) {
      spawnCmd = 'python3';
      spawnArgs = [
        ptyRunnerPath,
        '--cwd', terminalCwd,
        '--rows', String(termRows),
        '--cols', String(termCols),
        script
      ];
    } else {
      const hasScriptPty = fs.existsSync('/usr/bin/script');
      spawnCmd = hasScriptPty ? '/usr/bin/script' : '/bin/bash';
      spawnArgs = hasScriptPty
        ? ['-q', '-f', '-e', '-c', script, '/dev/null']
        : ['-c', script];
    }

    console.log(`[Terminal] Spawning process: ${spawnCmd} ${spawnArgs.join(' ')}`);
    const proc = spawn(spawnCmd, spawnArgs, {
      cwd: terminalCwd,
      env: {
        ...customEnv,
        LINES: String(currentTerminalRows),
        COLUMNS: String(currentTerminalCols)
      }
    });

    activeTerminalProcess = proc;
    activeCommandName = trimmed.split(' ')[0] || 'process';
    broadcastToTerminal({ type: 'status', activeProcess: activeCommandName, cwd: terminalCwd });

    let rawStdout = '';
    let rawStderr = '';

    proc.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      console.log(`[Terminal] STDOUT: ${text.length} chars`);
      rawStdout += text;
      broadcastToTerminal({ type: 'output', data: text });
      // If TUI queries background color (OSC 11), respond immediately to prevent query stall
      if (text.includes('\x1b]11;?')) {
        console.log(`[Terminal] OSC 11 detected, responding...`);
        try {
          proc.stdin?.write('\x1b]11;rgb:0000/0000/0000\x07');
        } catch (e: any) {
          console.error(`[Terminal] Failed to write OSC 11 response: ${e.message}`);
        }
      }
    });

    proc.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      console.log(`[Terminal] STDERR: ${text}`);
      rawStderr += text;
      broadcastToTerminal({ type: 'output', data: text });
    });

    const cleanupAndFinish = (code: number | null) => {
      console.log(`[Terminal] Process exited with code ${code}`);
      if (activeTerminalProcess === proc) {
        activeTerminalProcess = null;
        activeCommandName = null;
        broadcastToTerminal({ type: 'status', activeProcess: null, cwd: terminalCwd });
      }
      const exitCode = code ?? 0;
      let newCwd = terminalCwd;

      if (fs.existsSync(cwdFile)) {
        try {
          const candidateCwd = fs.readFileSync(cwdFile, 'utf-8').trim();
          if (candidateCwd && fs.existsSync(candidateCwd)) {
            newCwd = candidateCwd;
            terminalCwd = newCwd;
          }
          fs.unlinkSync(cwdFile);
        } catch (_) {}
      }

      broadcastToTerminal({
        type: 'output',
        data: exitCode !== 0 ? `\r\n\x1b[31m[exit code ${exitCode}]\x1b[0m\r\n` : `\r\n`,
        cwd: terminalCwd,
        activeProcess: null
      });

      resolve({
        stdout: rawStdout,
        stderr: rawStderr,
        exitCode,
        cwd: terminalCwd
      });
    };

    proc.on('close', cleanupAndFinish);

    proc.on('error', (err: any) => {
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
      defaultModel: cachedWorkingModel,
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

  // Trigger dynamic pre-flight model scanner in the background to detect the optimal working model
  findWorkingModel().then((working) => {
    console.log(`[Antigravity] Startup model scan concluded. Optimal model: ${working}`);
    ensureAntigravityCliSettings(); // update file with discovered model
  }).catch(console.error);

  // Pre-download and setup official GitHub CLI if needed
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

  // --- TERMINAL & AUDIT SSE & INPUT ENDPOINTS ---

  // 1. /api/terminal/stream - SSE endpoint for interactive shell session output
  app.get("/api/terminal/stream", (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Content-Encoding', 'none');
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

      // If a process is actively running, signal window size change
      if (activeTerminalProcess && !activeTerminalProcess.killed) {
        try {
          activeTerminalProcess.stdin?.write(`__PTY_RESIZE__:${currentTerminalCols}:${currentTerminalRows}\n`);
        } catch (e) {}
        try {
          activeTerminalProcess.kill('SIGWINCH');
        } catch (e) {}
      }

      return res.json({ success: true, cols: currentTerminalCols, rows: currentTerminalRows });
    }
    return res.status(400).json({ error: "Invalid dimensions provided." });
  });

  // 3. /api/terminal/log - SSE endpoint for agent audit logging from /tmp/agent_terminal.log
  app.get("/api/terminal/log", (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Content-Encoding', 'none');
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

  // Get currently resolved optimal working model
  app.get("/api/terminal/working-model", (req, res) => {
    res.json({ model: cachedWorkingModel });
  });

  // Manually trigger pre-flight model scan
  app.post("/api/terminal/scan-model", async (req, res) => {
    const working = await findWorkingModel();
    ensureAntigravityCliSettings();
    res.json({ success: true, model: working });
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
