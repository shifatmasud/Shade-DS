import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from "@modelcontextprotocol/sdk/types.js";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);
const WORKSPACE_ROOT = process.cwd();
const AGENT_LOG_PATH = "/tmp/agent_terminal.log";

// Helper to log actions to agent terminal audit log
export function appendAuditLog(entry: string) {
  try {
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] [MCP-REMOTE] ${entry}\n`;
    fs.appendFileSync(AGENT_LOG_PATH, formatted, "utf-8");
  } catch (err) {
    console.error("Failed to append to audit log:", err);
  }
}

// Safely resolve and validate workspace paths
export function resolveSafePath(userPath: string = "."): { fullPath: string; relPath: string; isSafe: boolean } {
  const normalized = path.normalize(userPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const fullPath = path.resolve(WORKSPACE_ROOT, normalized);
  const isSafe = fullPath.startsWith(WORKSPACE_ROOT);
  const relPath = path.relative(WORKSPACE_ROOT, fullPath) || ".";
  return { fullPath, relPath, isSafe };
}

// Tool definitions conforming to MCP Tool schema
export const WORKSPACE_TOOLS: Tool[] = [
  {
    name: "workspace_run_command",
    description: "Execute any bash shell command inside the project workspace (e.g. git, npm, ls, tsc, curl). Returns stdout, stderr, and execution duration.",
    inputSchema: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "The bash command line string to execute."
        },
        cwd: {
          type: "string",
          description: "Working directory relative to project root (default: project root)."
        },
        timeoutMs: {
          type: "number",
          description: "Execution timeout in milliseconds (default: 30000, max: 120000)."
        }
      },
      required: ["command"]
    }
  },
  {
    name: "workspace_read_file",
    description: "Read the text contents of any file in the workspace, with optional line range slice.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to the file relative to the project root (e.g. 'package.json', 'server.ts')."
        },
        startLine: {
          type: "number",
          description: "Optional 1-indexed starting line number."
        },
        endLine: {
          type: "number",
          description: "Optional 1-indexed ending line number."
        }
      },
      required: ["path"]
    }
  },
  {
    name: "workspace_write_file",
    description: "Create or completely overwrite a file in the workspace. Automatically creates parent directories if needed.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Destination file path relative to project root."
        },
        content: {
          type: "string",
          description: "Full text content to write."
        }
      },
      required: ["path", "content"]
    }
  },
  {
    name: "workspace_edit_file",
    description: "Replace a target string snippet with a replacement string in an existing workspace file.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to the file relative to project root."
        },
        targetContent: {
          type: "string",
          description: "Exact text substring to search for and replace."
        },
        replacementContent: {
          type: "string",
          description: "New text to substitute in place of targetContent."
        },
        replaceAll: {
          type: "boolean",
          description: "Whether to replace all occurrences or just the first (default: false)."
        }
      },
      required: ["path", "targetContent", "replacementContent"]
    }
  },
  {
    name: "workspace_list_dir",
    description: "List files and subdirectories in a workspace path with file sizes and type information.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Directory path relative to project root (default: '.')."
        },
        recursive: {
          type: "boolean",
          description: "Whether to recursively list directory contents (default: false)."
        },
        maxDepth: {
          type: "number",
          description: "Maximum depth when recursive listing is enabled (default: 2, max: 4)."
        }
      }
    }
  },
  {
    name: "workspace_project_status",
    description: "Get comprehensive project status including git branch and diff, running Node version, memory usage, environment facts, and dev server status.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "workspace_terminal_input",
    description: "Send a command line or key sequence into the project shell and log to agent terminal history.",
    inputSchema: {
      type: "object",
      properties: {
        input: {
          type: "string",
          description: "The command string or input line to submit."
        }
      },
      required: ["input"]
    }
  },
  {
    name: "workspace_inspect_logs",
    description: "Retrieve recent terminal and audit logs from the AI Studio container.",
    inputSchema: {
      type: "object",
      properties: {
        lines: {
          type: "number",
          description: "Number of recent lines to retrieve (default: 50, max: 500)."
        }
      }
    }
  }
];

// Core tool execution logic
export async function executeWorkspaceTool(name: string, args: Record<string, any> = {}): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  appendAuditLog(`Executing tool: ${name} with args: ${JSON.stringify(args).slice(0, 300)}`);

  try {
    switch (name) {
      case "workspace_run_command": {
        const { command, cwd: rawCwd, timeoutMs = 30000 } = args;
        if (!command || typeof command !== "string") {
          return {
            content: [{ type: "text", text: "Error: Missing or invalid 'command' parameter." }],
            isError: true
          };
        }

        const effectiveCwd = rawCwd ? resolveSafePath(rawCwd).fullPath : WORKSPACE_ROOT;
        const binDir = path.join(WORKSPACE_ROOT, "bin");
        const customEnv = {
          ...process.env,
          PATH: `${binDir}:/root/.local/bin:${process.env.HOME || "/root"}/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${process.env.PATH || ""}`,
        };

        const startTime = Date.now();
        const timeout = Math.min(120000, Math.max(1000, Number(timeoutMs) || 30000));

        try {
          const { stdout, stderr } = await execAsync(command, {
            cwd: effectiveCwd,
            env: customEnv,
            timeout,
            maxBuffer: 10 * 1024 * 1024 // 10MB
          });
          const durationMs = Date.now() - startTime;
          const resultText = [
            `Command: ${command}`,
            `Working Directory: ${effectiveCwd}`,
            `Duration: ${durationMs}ms`,
            `Exit Code: 0`,
            stdout ? `\n--- STDOUT ---\n${stdout}` : "",
            stderr ? `\n--- STDERR ---\n${stderr}` : ""
          ].filter(Boolean).join("\n");

          return { content: [{ type: "text", text: resultText }] };
        } catch (execErr: any) {
          const durationMs = Date.now() - startTime;
          const resultText = [
            `Command Failed: ${command}`,
            `Exit Code: ${execErr.code ?? "unknown"}`,
            `Duration: ${durationMs}ms`,
            execErr.stdout ? `\n--- STDOUT ---\n${execErr.stdout}` : "",
            execErr.stderr ? `\n--- STDERR ---\n${execErr.stderr}` : "",
            execErr.message ? `\n--- ERROR ---\n${execErr.message}` : ""
          ].filter(Boolean).join("\n");

          return { content: [{ type: "text", text: resultText }], isError: true };
        }
      }

      case "workspace_read_file": {
        const { path: filePath, startLine, endLine } = args;
        if (!filePath) {
          return { content: [{ type: "text", text: "Error: 'path' parameter is required." }], isError: true };
        }

        const { fullPath, relPath, isSafe } = resolveSafePath(filePath);
        if (!isSafe || !fs.existsSync(fullPath)) {
          return { content: [{ type: "text", text: `Error: File not found or inaccessible: ${relPath}` }], isError: true };
        }

        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          return { content: [{ type: "text", text: `Error: Path '${relPath}' is a directory, not a file. Use workspace_list_dir.` }], isError: true };
        }

        const content = fs.readFileSync(fullPath, "utf-8");
        const lines = content.split("\n");
        const totalLines = lines.length;

        let outputContent = content;
        let lineRangeNote = "";

        if (startLine || endLine) {
          const start = Math.max(1, Number(startLine) || 1);
          const end = Math.min(totalLines, Number(endLine) || totalLines);
          const sliced = lines.slice(start - 1, end);
          outputContent = sliced.map((line, idx) => `${start + idx}: ${line}`).join("\n");
          lineRangeNote = ` (Lines ${start} to ${end} of ${totalLines})`;
        }

        return {
          content: [
            {
              type: "text",
              text: `=== File: ${relPath} (${stat.size} bytes, ${totalLines} total lines)${lineRangeNote} ===\n\n${outputContent}`
            }
          ]
        };
      }

      case "workspace_write_file": {
        const { path: filePath, content } = args;
        if (!filePath || content === undefined) {
          return { content: [{ type: "text", text: "Error: 'path' and 'content' parameters are required." }], isError: true };
        }

        const { fullPath, relPath, isSafe } = resolveSafePath(filePath);
        if (!isSafe) {
          return { content: [{ type: "text", text: `Error: Invalid target path: ${relPath}` }], isError: true };
        }

        // Ensure parent directory exists
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true, mode: 0o777 });
        }

        fs.writeFileSync(fullPath, String(content), "utf-8");
        try { fs.chmodSync(fullPath, 0o666); } catch (_) {}
        try { execAsync(`git add "${relPath}"`, { cwd: WORKSPACE_ROOT }); } catch (_) {}
        const bytesWritten = Buffer.byteLength(String(content), "utf-8");

        return {
          content: [
            {
              type: "text",
              text: `Successfully wrote ${bytesWritten} bytes to ${relPath}.`
            }
          ]
        };
      }

      case "workspace_edit_file": {
        const { path: filePath, targetContent, replacementContent, replaceAll = false } = args;
        if (!filePath || targetContent === undefined || replacementContent === undefined) {
          return {
            content: [{ type: "text", text: "Error: 'path', 'targetContent', and 'replacementContent' are all required." }],
            isError: true
          };
        }

        const { fullPath, relPath, isSafe } = resolveSafePath(filePath);
        if (!isSafe || !fs.existsSync(fullPath)) {
          return { content: [{ type: "text", text: `Error: File not found: ${relPath}` }], isError: true };
        }

        const original = fs.readFileSync(fullPath, "utf-8");
        if (!original.includes(targetContent)) {
          return {
            content: [{ type: "text", text: `Error: targetContent was not found in ${relPath}. No changes made.` }],
            isError: true
          };
        }

        let updated: string;
        let count = 0;
        if (replaceAll) {
          const parts = original.split(targetContent);
          count = parts.length - 1;
          updated = parts.join(replacementContent);
        } else {
          updated = original.replace(targetContent, replacementContent);
          count = 1;
        }

        fs.writeFileSync(fullPath, updated, "utf-8");
        try { fs.chmodSync(fullPath, 0o666); } catch (_) {}
        try { execAsync(`git add "${relPath}"`, { cwd: WORKSPACE_ROOT }); } catch (_) {}

        return {
          content: [
            {
              type: "text",
              text: `Successfully replaced ${count} occurrence(s) of target content in ${relPath}.`
            }
          ]
        };
      }

      case "workspace_list_dir": {
        const { path: dirPath = ".", recursive = false, maxDepth = 2 } = args;
        const { fullPath, relPath, isSafe } = resolveSafePath(dirPath);
        if (!isSafe || !fs.existsSync(fullPath)) {
          return { content: [{ type: "text", text: `Error: Directory not found: ${relPath}` }], isError: true };
        }

        const entriesList: Array<{ name: string; path: string; isDirectory: boolean; sizeBytes?: number }> = [];

        function scan(currentPath: string, currentRel: string, currentDepth: number) {
          if (currentDepth > (Number(maxDepth) || 2)) return;
          const items = fs.readdirSync(currentPath, { withFileTypes: true });

          for (const item of items) {
            // Ignore heavy node_modules and .git folders
            if (item.name === "node_modules" || item.name === ".git") continue;

            const itemFull = path.join(currentPath, item.name);
            const itemRel = currentRel === "." ? item.name : `${currentRel}/${item.name}`;

            if (item.isDirectory()) {
              entriesList.push({ name: item.name, path: itemRel, isDirectory: true });
              if (recursive) {
                scan(itemFull, itemRel, currentDepth + 1);
              }
            } else {
              try {
                const stat = fs.statSync(itemFull);
                entriesList.push({ name: item.name, path: itemRel, isDirectory: false, sizeBytes: stat.size });
              } catch {
                entriesList.push({ name: item.name, path: itemRel, isDirectory: false });
              }
            }
          }
        }

        scan(fullPath, relPath, 1);

        const summaryText = entriesList
          .map(e => `${e.isDirectory ? "[DIR] " : "      "}${e.path}${e.sizeBytes !== undefined ? ` (${e.sizeBytes} B)` : ""}`)
          .join("\n");

        return {
          content: [
            {
              type: "text",
              text: `Directory Listing for '${relPath}' (${entriesList.length} items):\n\n${summaryText}`
            }
          ]
        };
      }

      case "workspace_project_status": {
        let gitBranch = "unknown";
        let gitStatus = "";
        try {
          gitBranch = (await execAsync("git rev-parse --abbrev-ref HEAD", { cwd: WORKSPACE_ROOT })).stdout.trim();
          gitStatus = (await execAsync("git status --short", { cwd: WORKSPACE_ROOT })).stdout.trim();
        } catch (_) {}

        let pkgInfo: any = {};
        try {
          const pkgRaw = fs.readFileSync(path.join(WORKSPACE_ROOT, "package.json"), "utf-8");
          pkgInfo = JSON.parse(pkgRaw);
        } catch (_) {}

        const statusReport = {
          workspace: {
            name: pkgInfo.name || "meta-prototype-starter",
            version: pkgInfo.version || "0.0.0",
            root: WORKSPACE_ROOT,
          },
          git: {
            branch: gitBranch,
            modifiedFiles: gitStatus ? gitStatus.split("\n") : []
          },
          runtime: {
            nodeVersion: process.version,
            platform: process.platform,
            uptimeSeconds: Math.floor(process.uptime()),
            memoryUsageMB: {
              rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
              heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
              heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
            }
          },
          connectors: {
            mcpEndpoints: {
              discovery: "/mcp",
              sse: "/mcp/sse",
              messages: "/mcp/messages",
              jsonRpcPost: "/mcp"
            },
            authentication: "none (open access)"
          }
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(statusReport, null, 2)
            }
          ]
        };
      }

      case "workspace_terminal_input": {
        const { input } = args;
        if (!input) {
          return { content: [{ type: "text", text: "Error: 'input' parameter is required." }], isError: true };
        }

        appendAuditLog(`Terminal input received: ${input}`);

        // Run the command and capture immediate output
        try {
          const { stdout, stderr } = await execAsync(input, {
            cwd: WORKSPACE_ROOT,
            timeout: 15000,
            env: {
              ...process.env,
              PATH: `${path.join(WORKSPACE_ROOT, "bin")}:/root/.local/bin:${process.env.PATH || ""}`
            }
          });

          return {
            content: [
              {
                type: "text",
                text: `Executed in terminal session:\n${stdout || stderr || "(completed with no output)"}`
              }
            ]
          };
        } catch (err: any) {
          return {
            content: [
              {
                type: "text",
                text: `Terminal command error:\n${err.stdout || err.stderr || err.message}`
              }
            ],
            isError: true
          };
        }
      }

      case "workspace_inspect_logs": {
        const { lines = 50 } = args;
        const count = Math.min(500, Math.max(1, Number(lines) || 50));

        if (!fs.existsSync(AGENT_LOG_PATH)) {
          return {
            content: [{ type: "text", text: "No logs found in /tmp/agent_terminal.log." }]
          };
        }

        const logContent = fs.readFileSync(AGENT_LOG_PATH, "utf-8");
        const logLines = logContent.split("\n").filter(Boolean);
        const recentLines = logLines.slice(-count);

        return {
          content: [
            {
              type: "text",
              text: `=== Last ${recentLines.length} audit log lines ===\n\n${recentLines.join("\n")}`
            }
          ]
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true
        };
    }
  } catch (err: any) {
    return {
      content: [{ type: "text", text: `Tool execution failed: ${err.message}` }],
      isError: true
    };
  }
}

// Factory to create a standard ModelContextProtocol Server instance for SSE transports
export function createWorkspaceMcpServer(): Server {
  const server = new Server(
    {
      name: "ai-studio-workspace-mcp",
      version: "1.0.0"
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: WORKSPACE_TOOLS };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: toolArgs } = request.params;
    const result = await executeWorkspaceTool(name, toolArgs || {});
    return result;
  });

  return server;
}

// Stateless JSON-RPC 2.0 handler for HTTP POST /mcp
export async function handleStatelessJsonRpc(body: any, baseUrl: string = ""): Promise<{
  statusCode: number;
  response: any;
}> {
  if (!body || typeof body !== "object") {
    return {
      statusCode: 400,
      response: {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error: Invalid JSON object" }
      }
    };
  }

  const { jsonrpc, id, method, params } = body;

  // Handle batch requests
  if (Array.isArray(body)) {
    const results = await Promise.all(body.map(item => handleStatelessJsonRpc(item, baseUrl)));
    return {
      statusCode: 200,
      response: results.map(r => r.response)
    };
  }

  // Handle notifications (no id)
  if (id === undefined || id === null) {
    if (method === "notifications/initialized") {
      appendAuditLog("Client initialized notification received via HTTP POST.");
      return { statusCode: 204, response: null };
    }
  }

  switch (method) {
    case "initialize": {
      return {
        statusCode: 200,
        response: {
          jsonrpc: "2.0",
          id: id ?? 1,
          result: {
            protocolVersion: "2024-11-05",
            serverInfo: {
              name: "ai-studio-workspace-mcp",
              version: "1.0.0"
            },
            capabilities: {
              tools: {
                listChanged: false
              }
            }
          }
        }
      };
    }

    case "ping": {
      return {
        statusCode: 200,
        response: {
          jsonrpc: "2.0",
          id: id ?? 1,
          result: {}
        }
      };
    }

    case "tools/list": {
      return {
        statusCode: 200,
        response: {
          jsonrpc: "2.0",
          id: id ?? 1,
          result: {
            tools: WORKSPACE_TOOLS
          }
        }
      };
    }

    case "tools/call": {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};

      if (!toolName) {
        return {
          statusCode: 200,
          response: {
            jsonrpc: "2.0",
            id: id ?? 1,
            error: {
              code: -32602,
              message: "Invalid params: 'name' is required for tools/call"
            }
          }
        };
      }

      const result = await executeWorkspaceTool(toolName, toolArgs);
      return {
        statusCode: 200,
        response: {
          jsonrpc: "2.0",
          id: id ?? 1,
          result
        }
      };
    }

    default: {
      return {
        statusCode: 200,
        response: {
          jsonrpc: "2.0",
          id: id ?? 1,
          error: {
            code: -32601,
            message: `Method not found: '${method}'`
          }
        }
      };
    }
  }
}
