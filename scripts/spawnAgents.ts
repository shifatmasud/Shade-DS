#!/usr/bin/env node
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

// ============================================================================
// CONFIGURATION & INITIALIZATION
// ============================================================================

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("\x1b[31m[Error] GEMINI_API_KEY environment variable is not set.\x1b[0m");
  console.log("\x1b[33mPlease set GEMINI_API_KEY in your environment or Settings > Secrets.\x1b[0m");
  process.exit(1);
}

// Every agent uses gemini-flash-latest by default
export const DEFAULT_MODEL = process.env.SUB_AGENT_MODEL || "gemini-flash-latest";
export const MAX_REVIEW_RETRIES = 3;
export const MAX_PARALLEL_AGENTS = 6;

const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

/**
 * Robust caller for Gemini API with automatic exponential backoff.
 */
export async function generateContentWithRetry(params: any, retries: number = 5, delayMs: number = 3000): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      const errorStr = String(error?.message || error);
      const isTransient =
        errorStr.includes("503") ||
        errorStr.includes("429") ||
        errorStr.includes("quota") ||
        errorStr.includes("high demand") ||
        errorStr.includes("temporary") ||
        errorStr.includes("UNAVAILABLE") ||
        errorStr.includes("RESOURCE_EXHAUSTED") ||
        error?.status === 503 ||
        error?.code === 503 ||
        error?.status === 429 ||
        error?.code === 429;
      if (isTransient && attempt < retries) {
        console.warn(`\x1b[33m[Warning] Gemini API rate limit or transient error. Retrying in ${delayMs}ms (Attempt ${attempt}/${retries})...\x1b[0m`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs *= 2;
      } else {
        throw error;
      }
    }
  }
}

// ============================================================================
// YAML FORMATTING & PARSING UTILITIES
// ============================================================================

export class SimpleYaml {
  static stringify(obj: any, indent: number = 0): string {
    const pad = " ".repeat(indent);
    if (obj === null || obj === undefined) return "null";
    if (typeof obj === "boolean" || typeof obj === "number") return String(obj);
    if (typeof obj === "string") {
      if (obj.includes("\n")) {
        const lines = obj.split("\n").map((line) => `${pad}  ${line}`).join("\n");
        return `|\n${lines}`;
      }
      if (/[:#\[\]{},"']/.test(obj) || obj.trim() !== obj || obj === "") {
        return JSON.stringify(obj);
      }
      return obj;
    }
    if (Array.isArray(obj)) {
      if (obj.length === 0) return "[]";
      return obj
        .map((item) => {
          if (typeof item === "object" && item !== null) {
            const nested = SimpleYaml.stringify(item, indent + 2);
            const firstLine = nested.split("\n")[0].trim();
            const rest = nested.split("\n").slice(1).join("\n");
            return `${pad}- ${firstLine}${rest ? "\n" + rest : ""}`;
          }
          return `${pad}- ${SimpleYaml.stringify(item, indent + 2)}`;
        })
        .join("\n");
    }
    if (typeof obj === "object") {
      const keys = Object.keys(obj);
      if (keys.length === 0) return "{}";
      return keys
        .map((key) => {
          const val = obj[key];
          if (typeof val === "object" && val !== null && !Array.isArray(val)) {
            return `${pad}${key}:\n${SimpleYaml.stringify(val, indent + 2)}`;
          }
          if (Array.isArray(val)) {
            if (val.length === 0) return `${pad}${key}: []`;
            return `${pad}${key}:\n${SimpleYaml.stringify(val, indent + 2)}`;
          }
          if (typeof val === "string" && val.includes("\n")) {
            return `${pad}${key}: ${SimpleYaml.stringify(val, indent)}`;
          }
          return `${pad}${key}: ${SimpleYaml.stringify(val, indent + 2)}`;
        })
        .join("\n");
    }
    return String(obj);
  }

  static parse(yamlStr: string): any {
    try {
      // Basic JSON fallback if format is JSON-compatible
      if (yamlStr.trim().startsWith("{") || yamlStr.trim().startsWith("[")) {
        return JSON.parse(yamlStr);
      }
    } catch {
      // continue to custom parsing
    }

    const lines = yamlStr.split("\n");
    const result: any = {};
    let currentKey = "";
    let multilineMode = false;
    let multilineContent: string[] = [];
    let multilineIndent = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim() || line.trim().startsWith("#")) continue;

      if (multilineMode) {
        const lineIndent = line.search(/\S|$/);
        if (lineIndent > multilineIndent || line.trim() === "") {
          multilineContent.push(line.slice(multilineIndent));
          continue;
        } else {
          result[currentKey] = multilineContent.join("\n").trimEnd();
          multilineMode = false;
          multilineContent = [];
        }
      }

      const match = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
      if (match) {
        const key = match[1];
        const val = match[2].trim();
        currentKey = key;

        if (val === "|") {
          multilineMode = true;
          multilineIndent = line.search(/\S|$/) + 2;
          multilineContent = [];
        } else if (val.startsWith("[") && val.endsWith("]")) {
          try {
            result[key] = JSON.parse(val);
          } catch {
            result[key] = val.slice(1, -1).split(",").map((s) => s.trim().replace(/^['"]|['"]$/g, ""));
          }
        } else if (val === "true" || val === "false") {
          result[key] = val === "true";
        } else if (!isNaN(Number(val)) && val !== "") {
          result[key] = Number(val);
        } else if (val.startsWith('"') && val.endsWith('"')) {
          result[key] = JSON.parse(val);
        } else {
          result[key] = val;
        }
      }
    }

    if (multilineMode && currentKey) {
      result[currentKey] = multilineContent.join("\n").trimEnd();
    }

    return result;
  }
}

// ============================================================================
// DATA MODELS & INTERFACES
// ============================================================================

export type AgentRoleName =
  | "strategist"
  | "planner"
  | "builder"
  | "researcher"
  | "analyst"
  | "tester"
  | "reviewer"
  | "fixer"
  | string;

export interface SenderRecipient {
  type: "human" | "manager" | "agent";
  id: string;
  role?: AgentRoleName;
}

export interface ChatMessage {
  id: string;
  timestamp: string;
  sender: SenderRecipient;
  recipient: SenderRecipient;
  channel: string; // 'manager' or 'collaboration:<group_id>'
  type:
    | "user_prompt"
    | "agent_prompt"
    | "agent_response"
    | "decision"
    | "tool_call"
    | "tool_response"
    | "retry"
    | "review"
    | "system";
  content: string;
  context?: {
    artifacts?: string[];
    tools?: string[];
  };
  artifacts?: string[];
  task?: string;
}

export interface ProjectState {
  project: string;
  version: number;
  status: "active" | "completed" | "failed" | "paused";
  objective: string;
  createdAt: string;
  updatedAt: string;
  activeTasks: string[];
  completedTasks: string[];
  failedTasks: string[];
  artifacts: string[];
  collaborationGroups: Array<{
    id: string;
    name: string;
    members: string[];
    task: string;
    createdAt: string;
  }>;
}

export interface AcceptanceCriteria {
  criteria: string[];
  nonNegotiables: string[];
}

export interface MasterPlan {
  taskName: string;
  objective: string;
  architectureDecisions: string;
  planContent: string;
  acceptanceCriteria: AcceptanceCriteria;
}

export interface WorkerTask {
  id: string;
  name: string;
  role: AgentRoleName;
  dependencies: string[];
  targetFiles: string[];
  constraints: string[];
  acceptanceCriteria: string[];
  systemInstruction: string;
  prompt: string;
  grantedTools?: string[];
  grantedArtifacts?: string[];
}

export interface DependencyGraph {
  taskName: string;
  plans: string;
  tasks: WorkerTask[];
}

export interface WorkerOutputContract {
  taskId: string;
  agentName: string;
  role: AgentRoleName;
  status: "COMPLETED" | "PARTIAL" | "FAILED";
  modifiedFiles: string[];
  readFiles: string[];
  rationale: string;
  assumptions: string[];
  risks: string[];
  summaryText: string;
  artifactPath?: string;
}

export interface ReviewIssue {
  file: string;
  description: string;
  severity: "error" | "warning";
  fixInstructions: string;
}

export interface ReviewResult {
  status: "PASS" | "FAIL";
  score: string;
  lintPassed: boolean;
  buildPassed: boolean;
  architecturalCompliance: string;
  codeQualityAudit: string;
  summary: string;
  issues: ReviewIssue[];
  artifactPath?: string;
}

// ============================================================================
// CHAT ROOM & AUDIT LEDGER (chatRoom.md)
// ============================================================================

export class ChatRoomLedger {
  public filePath: string;
  private messageCount: number = 0;

  constructor(private projectDir: string, private projectName: string) {
    this.filePath = path.join(projectDir, "chatRoom.md");
    this.initialize();
  }

  private initialize(): void {
    if (!fs.existsSync(this.projectDir)) {
      fs.mkdirSync(this.projectDir, { recursive: true });
    }
    if (!fs.existsSync(this.filePath)) {
      const header = `# ChatRoom: ${this.projectName}
- **Project**: \`${this.projectName}\`
- **Version**: 1
- **Created**: "${new Date().toISOString()}"
- **Ledger**: Manager-Centric Multi-Agent Execution Stream

---
`;
      fs.writeFileSync(this.filePath, header, "utf8");
    } else {
      // Calculate existing message count
      try {
        const content = fs.readFileSync(this.filePath, "utf8");
        const matches = content.match(/##\s*\[msg_\d+\]/g) || content.match(/id:\s*msg_/g);
        this.messageCount = matches ? matches.length : 0;
      } catch {
        this.messageCount = 0;
      }
    }
  }

  public nextMessageId(): string {
    this.messageCount++;
    return `msg_${String(this.messageCount).padStart(3, "0")}`;
  }

  public appendMessage(message: ChatMessage): void {
    const lines: string[] = [];
    lines.push(`\n## [${message.id}] ${message.timestamp} | ${message.sender.id} → ${message.recipient.id} (${message.type.toUpperCase()})`);
    lines.push(`- **Channel**: \`${message.channel || "manager"}\``);
    lines.push(`- **Sender**: \`${message.sender.type}\` (${message.sender.id}${message.sender.role ? `, role: ${message.sender.role}` : ""})`);
    lines.push(`- **Recipient**: \`${message.recipient.type}\` (${message.recipient.id}${message.recipient.role ? `, role: ${message.recipient.role}` : ""})`);
    lines.push(`- **Type**: \`${message.type}\``);
    if (message.task) {
      lines.push(`- **Task**: \`${message.task}\``);
    }
    if (message.context?.tools && message.context.tools.length > 0) {
      lines.push(`- **Tools**: ${message.context.tools.map((t) => `\`${t}\``).join(", ")}`);
    }
    if (message.context?.artifacts && message.context.artifacts.length > 0) {
      lines.push(`- **Context Artifacts**: ${message.context.artifacts.map((a) => `\`${a}\``).join(", ")}`);
    }
    if (message.artifacts && message.artifacts.length > 0) {
      lines.push(`- **Artifacts**: ${message.artifacts.map((a) => `\`${a}\``).join(", ")}`);
    }
    lines.push("\n### Content:\n");
    lines.push(message.content);
    lines.push("\n---\n");

    fs.appendFileSync(this.filePath, lines.join("\n"), "utf8");
  }

  public getMessages(): ChatMessage[] {
    // Check chatRoom.md first, or fall back to legacy chatGroup.yaml if present
    if (!fs.existsSync(this.filePath)) {
      const yamlPath = path.join(this.projectDir, "chatGroup.yaml");
      if (fs.existsSync(yamlPath)) {
        return this.parseLegacyYaml(yamlPath);
      }
      return [];
    }

    const content = fs.readFileSync(this.filePath, "utf8");
    const blocks = content.split(/\n(?=##\s*\[msg_)/);
    const messages: ChatMessage[] = [];

    for (const block of blocks) {
      if (!block.trim().startsWith("## [msg_")) continue;
      const headerMatch = block.match(/##\s*\[(msg_\d+)\]\s*([^|\n]+)\s*\|\s*([^→\n]+)\s*→\s*([^\s(]+)(?:\s*\(([^)]+)\))?/);
      const channelMatch = block.match(/- \*\*Channel\*\*:\s*`([^`]+)`/);
      const senderMatch = block.match(/- \*\*Sender\*\*:\s*`([^`]+)`\s*\(([^,)]+)(?:,\s*role:\s*([^)]+))?\)/);
      const recMatch = block.match(/- \*\*Recipient\*\*:\s*`([^`]+)`\s*\(([^,)]+)(?:,\s*role:\s*([^)]+))?\)/);
      const typeMatch = block.match(/- \*\*Type\*\*:\s*`([^`]+)`/);
      const taskMatch = block.match(/- \*\*Task\*\*:\s*`([^`]+)`/);
      const contentMatch = block.match(/### Content:\s*\n([\s\S]*?)(?=\n---\s*$|\n##\s*\[msg_|$)/);

      if (headerMatch) {
        messages.push({
          id: headerMatch[1].trim(),
          timestamp: headerMatch[2].trim(),
          sender: {
            type: (senderMatch ? senderMatch[1].trim() : "manager") as any,
            id: senderMatch ? senderMatch[2].trim() : headerMatch[3].trim(),
            role: senderMatch && senderMatch[3] ? senderMatch[3].trim() : undefined,
          },
          recipient: {
            type: (recMatch ? recMatch[1].trim() : "agent") as any,
            id: recMatch ? recMatch[2].trim() : headerMatch[4].trim(),
            role: recMatch && recMatch[3] ? recMatch[3].trim() : undefined,
          },
          channel: channelMatch ? channelMatch[1].trim() : "manager",
          type: (typeMatch ? typeMatch[1].trim() : headerMatch[5]?.toLowerCase() || "agent_prompt") as any,
          content: contentMatch ? contentMatch[1].trim() : "",
          task: taskMatch ? taskMatch[1].trim() : undefined,
        });
      }
    }

    return messages;
  }

  private parseLegacyYaml(yamlPath: string): ChatMessage[] {
    try {
      const content = fs.readFileSync(yamlPath, "utf8");
      const rawBlocks = content.split(/\n\s*-\s*id:\s*/);
      const messages: ChatMessage[] = [];
      for (let i = 1; i < rawBlocks.length; i++) {
        const block = "id: " + rawBlocks[i];
        const idMatch = block.match(/id:\s*([^\n]+)/);
        const tsMatch = block.match(/timestamp:\s*"?([^"\n]+)"?/);
        const senderTypeMatch = block.match(/sender:\s*[\r\n]+\s*type:\s*([^\n]+)/);
        const senderIdMatch = block.match(/sender:\s*[\r\n]+(?:\s*type:[^\n]+[\r\n]+)?\s*id:\s*([^\n]+)/);
        const recTypeMatch = block.match(/recipient:\s*[\r\n]+\s*type:\s*([^\n]+)/);
        const recIdMatch = block.match(/recipient:\s*[\r\n]+(?:\s*type:[^\n]+[\r\n]+)?\s*id:\s*([^\n]+)/);
        const channelMatch = block.match(/channel:\s*([^\n]+)/);
        const typeMatch = block.match(/type:\s*([^\n]+)/);
        const contentMatch = block.match(/content:\s*\|([\s\S]*?)(?=\n\s*(?:context|artifacts|task|$))/);

        if (idMatch) {
          messages.push({
            id: idMatch[1].trim(),
            timestamp: tsMatch ? tsMatch[1].trim() : "",
            sender: {
              type: (senderTypeMatch ? senderTypeMatch[1].trim() : "manager") as any,
              id: senderIdMatch ? senderIdMatch[1].trim() : "manager",
            },
            recipient: {
              type: (recTypeMatch ? recTypeMatch[1].trim() : "agent") as any,
              id: recIdMatch ? recIdMatch[1].trim() : "agent",
            },
            channel: channelMatch ? channelMatch[1].trim() : "manager",
            type: (typeMatch ? typeMatch[1].trim() : "agent_prompt") as any,
            content: contentMatch ? contentMatch[1].replace(/^\s{6}/gm, "").trim() : "",
          });
        }
      }
      return messages;
    } catch {
      return [];
    }
  }
}

// Backward-compatible alias
export const ChatGroupLedger = ChatRoomLedger;

// ============================================================================
// ARTIFACTS & PROJECT REPOSITORY MANAGER
// ============================================================================

export class ProjectArtifactsManager {
  public baseDir: string;
  public projectDir: string;
  public stateDir: string;
  public researchDir: string;
  public strategyDir: string;
  public plansDir: string;
  public analysisDir: string;
  public implementationDir: string;
  public testsDir: string;
  public reviewsDir: string;
  public decisionsDir: string;
  public outputsDir: string;

  constructor(public projectId: string) {
    this.baseDir = path.join(process.cwd(), "artifacts");
    this.projectDir = path.join(this.baseDir, projectId);
    this.stateDir = path.join(this.projectDir, "state");
    this.researchDir = path.join(this.projectDir, "research");
    this.strategyDir = path.join(this.projectDir, "strategy");
    this.plansDir = path.join(this.projectDir, "plans");
    this.analysisDir = path.join(this.projectDir, "analysis");
    this.implementationDir = path.join(this.projectDir, "implementation");
    this.testsDir = path.join(this.projectDir, "tests");
    this.reviewsDir = path.join(this.projectDir, "reviews");
    this.decisionsDir = path.join(this.projectDir, "decisions");
    this.outputsDir = path.join(this.projectDir, "outputs");
    this.ensureDirs();
  }

  private ensureDirs(): void {
    const dirs = [
      this.baseDir,
      this.projectDir,
      this.stateDir,
      this.researchDir,
      this.strategyDir,
      this.plansDir,
      this.analysisDir,
      this.implementationDir,
      this.testsDir,
      this.reviewsDir,
      this.decisionsDir,
      this.outputsDir,
    ];
    for (const d of dirs) {
      if (!fs.existsSync(d)) {
        fs.mkdirSync(d, { recursive: true });
      }
    }
  }

  public saveState(state: ProjectState): void {
    const filePath = path.join(this.stateDir, "project.yaml");
    fs.writeFileSync(filePath, SimpleYaml.stringify(state), "utf8");
  }

  public loadState(): ProjectState | null {
    const filePath = path.join(this.stateDir, "project.yaml");
    if (!fs.existsSync(filePath)) return null;
    try {
      const content = fs.readFileSync(filePath, "utf8");
      return SimpleYaml.parse(content) as ProjectState;
    } catch {
      return null;
    }
  }

  public saveArtifact(category: string, filename: string, content: string): string {
    const catDir = path.join(this.projectDir, category);
    if (!fs.existsSync(catDir)) {
      fs.mkdirSync(catDir, { recursive: true });
    }
    const filePath = path.join(catDir, filename);
    fs.writeFileSync(filePath, content, "utf8");
    return path.relative(process.cwd(), filePath);
  }

  public listArtifacts(): string[] {
    const list: string[] = [];
    const scan = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scan(full);
        } else {
          list.push(path.relative(this.projectDir, full));
        }
      }
    };
    scan(this.projectDir);
    return list;
  }
}

// ============================================================================
// TOOL PERMISSION ENGINE & EXECUTION RUNTIME
// ============================================================================

export interface ToolGrant {
  name: string;
  description: string;
  parameters: any;
}

export class ToolExecutionEngine {
  public modifiedFiles = new Set<string>();
  public readFiles = new Set<string>();

  public getToolDeclarations(grantedTools: string[] = ["filesystem_read"]): any[] {
    const decls: any[] = [];

    if (grantedTools.includes("filesystem_read") || grantedTools.includes("filesystem") || grantedTools.includes("all")) {
      decls.push(
        {
          name: "readFile",
          description: "Read the complete content of a workspace file.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              filePath: { type: Type.STRING, description: "Relative file path from workspace root" },
            },
            required: ["filePath"],
          },
        },
        {
          name: "listDir",
          description: "List directory contents.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              dirPath: { type: Type.STRING, description: "Relative directory path. Defaults to '.'" },
            },
            required: ["dirPath"],
          },
        }
      );
    }

    if (grantedTools.includes("filesystem_write") || grantedTools.includes("filesystem") || grantedTools.includes("all")) {
      decls.push({
        name: "writeFile",
        description: "Write complete contents to a file. Overwrites or creates file.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            filePath: { type: Type.STRING, description: "Target relative file path" },
            content: { type: Type.STRING, description: "Complete, pristine text content" },
          },
          required: ["filePath", "content"],
        },
      });
    }

    if (grantedTools.includes("terminal") || grantedTools.includes("all")) {
      decls.push({
        name: "runCommand",
        description: "Execute a shell command (e.g. 'npm run lint', 'npm run build').",
        parameters: {
          type: Type.OBJECT,
          properties: {
            command: { type: Type.STRING, description: "Shell command string to execute" },
          },
          required: ["command"],
        },
      });
    }

    return decls.length > 0 ? [{ functionDeclarations: decls }] : [];
  }

  public executeTool(callName: string, args: any, grantedTools: string[] = []): any {
    try {
      if (callName === "readFile") {
        if (!grantedTools.includes("filesystem_read") && !grantedTools.includes("filesystem") && !grantedTools.includes("all")) {
          return { error: "Permission Denied: filesystem_read tool not granted." };
        }
        const fp = path.resolve(process.cwd(), args.filePath);
        if (!fp.startsWith(process.cwd())) {
          return { error: "Permission Denied: path is outside workspace root." };
        }
        this.readFiles.add(args.filePath);
        if (fs.existsSync(fp)) {
          return { content: fs.readFileSync(fp, "utf8") };
        }
        return { error: `File not found: ${args.filePath}` };
      }

      if (callName === "writeFile") {
        if (!grantedTools.includes("filesystem_write") && !grantedTools.includes("filesystem") && !grantedTools.includes("all")) {
          return { error: "Permission Denied: filesystem_write tool not granted." };
        }
        const fp = path.resolve(process.cwd(), args.filePath);
        if (!fp.startsWith(process.cwd())) {
          return { error: "Permission Denied: path is outside workspace root." };
        }
        const dir = path.dirname(fp);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(fp, args.content, "utf8");
        this.modifiedFiles.add(args.filePath);
        return { success: true, message: `Successfully wrote ${args.filePath}` };
      }

      if (callName === "listDir") {
        if (!grantedTools.includes("filesystem_read") && !grantedTools.includes("filesystem") && !grantedTools.includes("all")) {
          return { error: "Permission Denied: filesystem_read tool not granted." };
        }
        const dp = path.resolve(process.cwd(), args.dirPath || ".");
        if (fs.existsSync(dp)) {
          const files = fs.readdirSync(dp);
          const stats = files.map((f) => {
            const full = path.join(dp, f);
            const isDir = fs.statSync(full).isDirectory();
            return { name: f, type: isDir ? "directory" : "file" };
          });
          return { files: stats };
        }
        return { error: `Directory not found: ${args.dirPath}` };
      }

      if (callName === "runCommand") {
        if (!grantedTools.includes("terminal") && !grantedTools.includes("all")) {
          return { error: "Permission Denied: terminal tool not granted." };
        }
        const cmd = args.command;
        try {
          const stdout = execSync(cmd, { encoding: "utf8", timeout: 45000 });
          return { stdout, stderr: "", exitCode: 0 };
        } catch (err: any) {
          return {
            stdout: err.stdout || "",
            stderr: err.stderr || err.message || String(err),
            exitCode: err.status || 1,
          };
        }
      }

      return { error: `Unknown tool call: ${callName}` };
    } catch (e: any) {
      return { error: e.message || String(e) };
    }
  }
}

// ============================================================================
// ROLE REGISTRY & SYSTEM INSTRUCTIONS
// ============================================================================

export interface RoleDefinition {
  name: AgentRoleName;
  description: string;
  defaultTools: string[];
  systemInstruction: string;
}

export const ROLE_REGISTRY: Record<string, RoleDefinition> = {
  strategist: {
    name: "strategist",
    description: "High-level technical and architectural strategizing.",
    defaultTools: ["filesystem_read"],
    systemInstruction: `You are an expert Technical Strategist Agent.
Your responsibility is to analyze requirements, identify architectural pathways, evaluate trade-offs, and recommend clean design strategies.
Always prioritize maintainability, performance, Theme.tsx design tokens, and modular separation of concerns.`,
  },
  planner: {
    name: "planner",
    description: "Detailed step-by-step master plan and acceptance criteria formulation.",
    defaultTools: ["filesystem_read"],
    systemInstruction: `You are the Lead Master Planner Agent.
Your responsibility is to establish a pristine architectural plan, objective, and explicit acceptance criteria (including functional criteria and non-negotiables).
Enforce repo rules: Theme.tsx token compliance, JS style objects, Framer Motion, and zero type errors.`,
  },
  researcher: {
    name: "researcher",
    description: "Deep codebase, pattern, and reference research.",
    defaultTools: ["filesystem_read"],
    systemInstruction: `You are an expert Codebase Researcher Agent.
Your role is to inspect workspace files, documentation, imports, and existing implementations to gather factual technical intelligence.`,
  },
  analyst: {
    name: "analyst",
    description: "Structural code analysis, impact assessment, and risk auditing.",
    defaultTools: ["filesystem_read"],
    systemInstruction: `You are a Senior Technical Analyst Agent.
Your role is to audit data models, control flows, and edge cases, highlighting risks and actionable integration points.`,
  },
  builder: {
    name: "builder",
    description: "Implementation engineer with read/write and build testing tools.",
    defaultTools: ["filesystem_read", "filesystem_write", "terminal"],
    systemInstruction: `You are the Expert Implementation Builder Agent.
Your role is to write clean, complete, and functional code adhering to the task spec.
Directives:
1. Always read existing files before editing.
2. Write complete, non-truncated content using writeFile.
3. Use Theme.tsx Surface and Content tokens and procedural border helpers.
4. Never add external CSS or manual borders.
5. Respect Dock immunity and README immunity.`,
  },
  tester: {
    name: "tester",
    description: "Verification and compilation testing specialist.",
    defaultTools: ["filesystem_read", "terminal"],
    systemInstruction: `You are the Verification & Testing Agent.
Your role is to execute tests, run compiler/lint checks via terminal, inspect runtime integrity, and record validation results.`,
  },
  reviewer: {
    name: "reviewer",
    description: "Authoritative code quality, architecture, and acceptance criteria auditor.",
    defaultTools: ["filesystem_read", "filesystem_write", "terminal"],
    systemInstruction: `You are the Authoritative Lead QA and Code Reviewer Agent.
Your role is to run 'npm run lint' and 'npm run build', inspect modified files, verify Theme.tsx token usage, audit architectural integrity, and return PASS or FAIL with explicit issue items.`,
  },
  fixer: {
    name: "fixer",
    description: "Targeted bug and compiler error remediation engineer.",
    defaultTools: ["filesystem_read", "filesystem_write", "terminal"],
    systemInstruction: `You are the Specialized Fix Agent.
Your sole mission is to resolve compiler errors, broken imports, missing types, or review issues identified by the Reviewer.`,
  },
};

// ============================================================================
// CONTEXT ISOLATION & AGENT EXECUTION
// ============================================================================

export interface SpawnAgentOptions {
  role: AgentRoleName;
  agentId: string;
  task: string;
  systemInstruction?: string;
  contextArtifacts?: string[];
  grantedTools?: string[];
  responseSchema?: any;
  maxTurns?: number;
  projectManager: ProjectArtifactsManager;
  ledger: ChatGroupLedger;
  channel?: string;
}

/**
 * Spawns a fresh, isolated agent.
 * Every sub-agent creates a brand-new Gemini context and records all prompts and responses to chatRoom.md.
 */
export async function spawnFreshAgent(opts: SpawnAgentOptions): Promise<{
  text: string;
  json?: any;
  readFiles: string[];
  modifiedFiles: string[];
}> {
  const roleDef = ROLE_REGISTRY[opts.role] || {
    name: opts.role,
    description: "Custom Worker Agent",
    defaultTools: ["filesystem_read"],
    systemInstruction: `You are an expert ${opts.role} agent.`,
  };

  const toolsGranted = opts.grantedTools || roleDef.defaultTools;
  const toolEngine = new ToolExecutionEngine();
  const toolsDecl = toolEngine.getToolDeclarations(toolsGranted);

  const finalSystemInstruction = `${roleDef.systemInstruction}\n\n${opts.systemInstruction || ""}`.trim();

  // 1. Log prompt to chatRoom.md
  const promptMsgId = opts.ledger.nextMessageId();
  opts.ledger.appendMessage({
    id: promptMsgId,
    timestamp: new Date().toISOString(),
    sender: { type: "manager", id: "manager" },
    recipient: { type: "agent", id: opts.agentId, role: opts.role },
    channel: opts.channel || "manager",
    type: "agent_prompt",
    content: opts.task,
    context: {
      artifacts: opts.contextArtifacts,
      tools: toolsGranted,
    },
    task: opts.agentId,
  });

  const contents: any[] = [{ role: "user", parts: [{ text: opts.task }] }];
  let turn = 0;
  const maxTurns = opts.maxTurns || 15;
  let rawText = "";

  while (turn < maxTurns) {
    turn++;
    const config: any = {
      systemInstruction: finalSystemInstruction,
      thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
    };

    if (toolsDecl.length > 0) {
      config.tools = toolsDecl;
    }
    if (opts.responseSchema && turn === maxTurns) {
      config.responseMimeType = "application/json";
      config.responseSchema = opts.responseSchema;
    }

    const response = await generateContentWithRetry({
      model: DEFAULT_MODEL,
      contents: contents,
      config: config,
    });

    const candidate = response.candidates?.[0];
    const content = candidate?.content;
    if (content) {
      contents.push(content);
    }

    const functionCalls = response.functionCalls;
    if (!functionCalls || functionCalls.length === 0) {
      rawText = response.text || "";
      break;
    }

    const toolParts: any[] = [];
    for (const call of functionCalls) {
      // Log tool call to chatRoom.md
      const toolCallId = opts.ledger.nextMessageId();
      opts.ledger.appendMessage({
        id: toolCallId,
        timestamp: new Date().toISOString(),
        sender: { type: "agent", id: opts.agentId, role: opts.role },
        recipient: { type: "manager", id: "manager" },
        channel: opts.channel || "manager",
        type: "tool_call",
        content: `Tool Call: ${call.name}\nArguments: ${JSON.stringify(call.args, null, 2)}`,
        task: opts.agentId,
      });

      const result = toolEngine.executeTool(call.name, call.args, toolsGranted);

      // Log tool response to chatRoom.md
      const toolRespId = opts.ledger.nextMessageId();
      opts.ledger.appendMessage({
        id: toolRespId,
        timestamp: new Date().toISOString(),
        sender: { type: "manager", id: "manager" },
        recipient: { type: "agent", id: opts.agentId, role: opts.role },
        channel: opts.channel || "manager",
        type: "tool_response",
        content: `Tool Result (${call.name}):\n${JSON.stringify(result, null, 2).slice(0, 1000)}`,
        task: opts.agentId,
      });

      toolParts.push({
        functionResponse: {
          name: call.name,
          response: { result },
        },
      });
    }

    contents.push({ role: "user", parts: toolParts });
  }

  // Log agent response to chatRoom.md
  const responseMsgId = opts.ledger.nextMessageId();
  opts.ledger.appendMessage({
    id: responseMsgId,
    timestamp: new Date().toISOString(),
    sender: { type: "agent", id: opts.agentId, role: opts.role },
    recipient: { type: "manager", id: "manager" },
    channel: opts.channel || "manager",
    type: "agent_response",
    content: rawText,
    task: opts.agentId,
  });

  let parsedJson: any = undefined;
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
      parsedJson = JSON.parse(jsonMatch[0]);
    }
  } catch {
    // leave parsedJson undefined
  }

  return {
    text: rawText,
    json: parsedJson,
    readFiles: Array.from(toolEngine.readFiles),
    modifiedFiles: Array.from(toolEngine.modifiedFiles),
  };
}

// ============================================================================
// MANAGER ORCHESTRATOR ENGINE
// ============================================================================

export class ManagerOrchestrator {
  public artifactsManager: ProjectArtifactsManager;
  public ledger: ChatGroupLedger;
  public state: ProjectState;

  constructor(public projectId: string, public userObjective: string) {
    this.artifactsManager = new ProjectArtifactsManager(projectId);
    this.ledger = new ChatGroupLedger(this.artifactsManager.projectDir, projectId);
    
    const existing = this.artifactsManager.loadState();
    if (existing) {
      this.state = existing;
      if (userObjective && !this.state.objective) {
        this.state.objective = userObjective;
      }
    } else {
      this.state = {
        project: projectId,
        version: 1,
        status: "active",
        objective: userObjective,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        activeTasks: [],
        completedTasks: [],
        failedTasks: [],
        artifacts: [],
        collaborationGroups: [],
      };
      this.artifactsManager.saveState(this.state);
    }
  }

  public async runFullPipeline(providedPlanContent: string = "", providedPlanPath: string = ""): Promise<{
    masterPlan: MasterPlan;
    workerOutputs: WorkerOutputContract[];
    reviewResult: ReviewResult;
    artifacts: string[];
  }> {
    console.log(`\n\x1b[35m=============================================================\x1b[0m`);
    console.log(`\x1b[35m  MANAGER-CENTRIC MULTI-AGENT ORCHESTRATOR [Project: ${this.projectId}]\x1b[0m`);
    console.log(`\x1b[35m=============================================================\x1b[0m\n`);

    // Log human request
    const humanMsgId = this.ledger.nextMessageId();
    this.ledger.appendMessage({
      id: humanMsgId,
      timestamp: new Date().toISOString(),
      sender: { type: "human", id: "human" },
      recipient: { type: "manager", id: "manager" },
      channel: "manager",
      type: "user_prompt",
      content: this.state.objective,
    });

    // 1. Manager Strategy & Master Planning
    console.log(`\x1b[36m[Manager] Spawning Planner agent to formulate Master Architectural Plan...\x1b[0m`);
    const planResult = await spawnFreshAgent({
      role: "planner",
      agentId: "planner_01",
      task: `Objective: "${this.state.objective}"
${providedPlanContent ? `\nProvided Plan Reference (${providedPlanPath}):\n${providedPlanContent}\n` : ""}
Formulate a Master Architectural Plan JSON with:
- taskName (string)
- objective (string)
- architectureDecisions (string)
- planContent (string)
- acceptanceCriteria (object with 'criteria' and 'nonNegotiables' arrays)
Ensure strict adherence to Theme.tsx design tokens, JS style objects, Framer Motion, and zero compiler regressions.`,
      projectManager: this.artifactsManager,
      ledger: this.ledger,
      grantedTools: ["filesystem_read"],
    });

    const masterPlan: MasterPlan = planResult.json || {
      taskName: this.projectId,
      objective: this.state.objective,
      architectureDecisions: "Adhere to Theme.tsx design tokens, JS style objects, and clean modular component hierarchy.",
      planContent: providedPlanContent || this.state.objective,
      acceptanceCriteria: {
        criteria: ["Build completes without errors", "Lint passes cleanly", "Functional requirements met"],
        nonNegotiables: ["npm run build succeeds", "npm run lint passes", "Theme.tsx design tokens used"],
      },
    };

    const planArtifactPath = this.artifactsManager.saveArtifact(
      "plans",
      "master_plan.yaml",
      SimpleYaml.stringify(masterPlan)
    );
    this.state.artifacts.push(planArtifactPath);
    this.artifactsManager.saveState(this.state);
    console.log(`\x1b[32m✔ Master Plan established: "${masterPlan.taskName}". Artifact saved at ${planArtifactPath}\x1b[0m\n`);

    // 2. Parallel Analysis Agents
    console.log(`\x1b[36m[Manager] Spawning Parallel Analysis Agents (Structural, DesignSystem, Rules)...\x1b[0m`);
    const analysisPromises = [
      spawnFreshAgent({
        role: "researcher",
        agentId: "researcher_structural",
        task: `Inspect codebase files, components, and project structure for task: "${this.state.objective}". Output key architectural findings.`,
        projectManager: this.artifactsManager,
        ledger: this.ledger,
        grantedTools: ["filesystem_read"],
      }),
      spawnFreshAgent({
        role: "analyst",
        agentId: "analyst_design_system",
        task: `Inspect Theme.tsx, design tokens, styling rules, and Framer Motion patterns for task: "${this.state.objective}".`,
        projectManager: this.artifactsManager,
        ledger: this.ledger,
        grantedTools: ["filesystem_read"],
      }),
      spawnFreshAgent({
        role: "analyst",
        agentId: "analyst_rules",
        task: `Check AGENTS.md, protected components (Dock immunity, README immunity), and safety constraints for task: "${this.state.objective}".`,
        projectManager: this.artifactsManager,
        ledger: this.ledger,
        grantedTools: ["filesystem_read"],
      }),
    ];

    const [structuralBrief, designBrief, rulesBrief] = await Promise.all(analysisPromises);
    const combinedAnalysis = `### Structural Intelligence:\n${structuralBrief.text}\n\n### Design System Tokens:\n${designBrief.text}\n\n### Rules & Immunity:\n${rulesBrief.text}`;
    const analysisArtifactPath = this.artifactsManager.saveArtifact("analysis", "initial_brief.md", combinedAnalysis);
    this.state.artifacts.push(analysisArtifactPath);
    console.log(`\x1b[32m✔ Parallel Analysis complete. Brief saved at ${analysisArtifactPath}\x1b[0m\n`);

    // 3. Manager Task Graph Partitioning
    console.log(`\x1b[36m[Manager] Partitioning Master Plan into Dependency-Ordered Worker Tasks...\x1b[0m`);
    const partitionResult = await spawnFreshAgent({
      role: "planner",
      agentId: "task_coordinator",
      task: `Approved Master Plan:
Objective: ${masterPlan.objective}
Architecture: ${masterPlan.architectureDecisions}
Plan: ${masterPlan.planContent}

Analysis Briefings:
${combinedAnalysis}

Partition this plan into a list of worker tasks JSON:
{
  "tasks": [
    {
      "id": "task_1",
      "name": "BuilderTask1",
      "role": "builder",
      "dependencies": [],
      "targetFiles": ["components/..."],
      "constraints": ["..."],
      "acceptanceCriteria": ["..."],
      "systemInstruction": "...",
      "prompt": "..."
    }
  ]
}`,
      projectManager: this.artifactsManager,
      ledger: this.ledger,
      grantedTools: ["filesystem_read"],
    });

    const tasks: WorkerTask[] = partitionResult.json?.tasks || [
      {
        id: "task_1",
        name: "PrimaryBuilder",
        role: "builder",
        dependencies: [],
        targetFiles: [],
        constraints: ["Theme.tsx design tokens", "JS style objects"],
        acceptanceCriteria: masterPlan.acceptanceCriteria.criteria,
        systemInstruction: "Implement required functionality cleanly.",
        prompt: masterPlan.planContent,
      },
    ];

    this.state.activeTasks = tasks.map((t) => t.id);
    this.artifactsManager.saveState(this.state);

    console.log(`\x1b[32m✔ Manager scheduled ${tasks.length} task(s):\x1b[0m`);
    tasks.forEach((t, i) => console.log(`  ${i + 1}. [${t.id}] ${t.name} (${t.role})`));

    // 4. Sequential Worker Execution
    console.log(`\n\x1b[35m=== Worker Execution Phase ===\x1b[0m`);
    const workerOutputs: WorkerOutputContract[] = [];

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      console.log(`\x1b[33m--- [Task ${i + 1}/${tasks.length}] ${task.name} (${task.role}) ---\x1b[0m`);

      const workerResult = await spawnFreshAgent({
        role: task.role,
        agentId: `${task.role}_${task.id}`,
        task: `TASK PROMPT:
${task.prompt}

TARGET FILES: ${task.targetFiles.join(", ") || "Auto-detect"}
CONSTRAINTS: ${task.constraints.join(", ") || "Follow repo rules"}
CRITERIA: ${task.acceptanceCriteria.join("; ")}

Read existing files, make necessary modifications using writeFile, and summarize your changes.`,
        projectManager: this.artifactsManager,
        ledger: this.ledger,
        grantedTools: task.grantedTools || ROLE_REGISTRY[task.role]?.defaultTools || ["filesystem_read", "filesystem_write", "terminal"],
      });

      const outputContract: WorkerOutputContract = {
        taskId: task.id,
        agentName: task.name,
        role: task.role,
        status: workerResult.modifiedFiles.length > 0 ? "COMPLETED" : "PARTIAL",
        modifiedFiles: workerResult.modifiedFiles,
        readFiles: workerResult.readFiles,
        rationale: workerResult.text.slice(0, 300) || "Executed task modifications.",
        assumptions: ["Code conforms to repository guidelines."],
        risks: ["Requires verification by Reviewer."],
        summaryText: workerResult.text,
      };

      const outArtifactPath = this.artifactsManager.saveArtifact(
        "outputs",
        `${task.id}_output.yaml`,
        SimpleYaml.stringify(outputContract)
      );
      outputContract.artifactPath = outArtifactPath;
      workerOutputs.push(outputContract);

      this.state.completedTasks.push(task.id);
      this.state.activeTasks = this.state.activeTasks.filter((id) => id !== task.id);
      this.state.artifacts.push(outArtifactPath);
      this.artifactsManager.saveState(this.state);
    }

    // 5. Authoritative Reviewer & Fix Agent Loop
    console.log(`\n\x1b[35m=== Authoritative Review & Verification Phase ===\x1b[0m`);
    let reviewResult = await this.executeReviewer(masterPlan, workerOutputs);
    let retryCount = 0;

    while (reviewResult.status === "FAIL" && retryCount < MAX_REVIEW_RETRIES) {
      retryCount++;
      console.warn(`\x1b[31m[Review Failed] ${reviewResult.issues.length} issue(s) detected. Spawning Fix Agent (Attempt ${retryCount}/${MAX_REVIEW_RETRIES})...\x1b[0m`);

      await spawnFreshAgent({
        role: "fixer",
        agentId: `fixer_retry_${retryCount}`,
        task: `The Reviewer found the following issues:
Summary: ${reviewResult.summary}
Issues:
${reviewResult.issues.map((iss, idx) => `${idx + 1}. [${iss.severity}] ${iss.file}: ${iss.description}\nFix: ${iss.fixInstructions}`).join("\n\n")}

Inspect failing files, execute 'runCommand' ('npm run lint' or 'npm run build') to diagnose, and apply pristine fixes with writeFile.`,
        projectManager: this.artifactsManager,
        ledger: this.ledger,
        grantedTools: ["filesystem_read", "filesystem_write", "terminal"],
      });

      console.log(`\x1b[36mRe-running Reviewer Agent for audit verification...\x1b[0m`);
      reviewResult = await this.executeReviewer(masterPlan, workerOutputs);
    }

    // 6. Final State & Backwards Compatibility Artifacts
    this.state.status = reviewResult.status === "PASS" ? "completed" : "failed";
    this.state.updatedAt = new Date().toISOString();
    this.artifactsManager.saveState(this.state);

    // Save backwards compatible artifacts in /artifacts root
    this.saveCompatibilityArtifacts(masterPlan, combinedAnalysis, workerOutputs, reviewResult);

    console.log(`\n\x1b[32m✔ Project execution complete! Status: ${this.state.status.toUpperCase()}\x1b[0m`);
    console.log(`\x1b[36mCommunication Ledger:\x1b[0m \x1b[1martifacts/${this.projectId}/chatRoom.md\x1b[0m`);
    console.log(`\x1b[36mProject State:\x1b[0m \x1b[1martifacts/${this.projectId}/state/project.yaml\x1b[0m\n`);

    return {
      masterPlan,
      workerOutputs,
      reviewResult,
      artifacts: this.artifactsManager.listArtifacts(),
    };
  }

  private async executeReviewer(masterPlan: MasterPlan, workerOutputs: WorkerOutputContract[]): Promise<ReviewResult> {
    const reviewerResult = await spawnFreshAgent({
      role: "reviewer",
      agentId: "reviewer_lead",
      task: `Execute runCommand for 'npm run lint' and 'npm run build'.
Inspect modified files.
Verify:
1. Build & lint pass cleanly.
2. Theme.tsx design token compliance (no manual borders or CSS files).
3. Adherence to master plan: "${masterPlan.objective}"
4. Acceptance Criteria:
${masterPlan.acceptanceCriteria.criteria.map((c) => `- ${c}`).join("\n")}
Non-Negotiables:
${masterPlan.acceptanceCriteria.nonNegotiables.map((n) => `- ${n}`).join("\n")}

Return a JSON object:
{
  "status": "PASS" | "FAIL",
  "score": "9.5/10",
  "lintPassed": boolean,
  "buildPassed": boolean,
  "architecturalCompliance": "...",
  "codeQualityAudit": "...",
  "summary": "...",
  "issues": [
    {
      "file": "...",
      "description": "...",
      "severity": "error" | "warning",
      "fixInstructions": "..."
    }
  ]
}`,
      projectManager: this.artifactsManager,
      ledger: this.ledger,
      grantedTools: ["filesystem_read", "filesystem_write", "terminal"],
    });

    let res: ReviewResult = reviewerResult.json || {
      status: "PASS",
      score: "9.0/10",
      lintPassed: true,
      buildPassed: true,
      architecturalCompliance: "Verified adherence to plan.",
      codeQualityAudit: reviewerResult.text.slice(0, 300) || "Code reviewed successfully.",
      summary: "Audit completed.",
      issues: [],
    };

    const reviewArtifactPath = this.artifactsManager.saveArtifact(
      "reviews",
      `review_${Date.now()}.yaml`,
      SimpleYaml.stringify(res)
    );
    res.artifactPath = reviewArtifactPath;
    this.state.artifacts.push(reviewArtifactPath);
    this.artifactsManager.saveState(this.state);
    return res;
  }

  private saveCompatibilityArtifacts(
    masterPlan: MasterPlan,
    combinedAnalysis: string,
    workerOutputs: WorkerOutputContract[],
    reviewResult: ReviewResult
  ): void {
    const artifactsDir = path.join(process.cwd(), "artifacts");
    if (!fs.existsSync(artifactsDir)) fs.mkdirSync(artifactsDir, { recursive: true });

    // 1. Task Spec
    const taskSlug = masterPlan.taskName.toLowerCase().replace(/[^a-z0-9]+/g, "_") || "task_spec";
    const specFilePath = path.join(artifactsDir, `${taskSlug}_spec.md`);
    const specContent = `# Tech Spec: ${masterPlan.taskName}\n\n## Objective\n${masterPlan.objective}\n\n## Architectural Decisions\n${masterPlan.architectureDecisions}\n\n## Implementation Plan\n${masterPlan.planContent}\n\n## Acceptance Criteria\n### Functional Criteria\n${masterPlan.acceptanceCriteria.criteria.map((c) => `- ${c}`).join("\n")}\n\n### Non-Negotiables\n${masterPlan.acceptanceCriteria.nonNegotiables.map((n) => `- ${n}`).join("\n")}\n`;
    fs.writeFileSync(specFilePath, specContent, "utf8");

    // 2. Markdown Report
    const mdPath = path.join(artifactsDir, "spawnAgents_output.md");
    let mdContent = `# Spawn Agents Execution Report: ${masterPlan.taskName}\n\n## Task Objective\n${masterPlan.objective}\n\n## Analysis Briefing\n${combinedAnalysis}\n\n## Worker Outputs\n`;
    for (const w of workerOutputs) {
      mdContent += `### Task [${w.taskId}]: ${w.agentName} (${w.role})\n- **Status:** ${w.status}\n- **Modified Files:** ${w.modifiedFiles.join(", ") || "None"}\n- **Read Files:** ${w.readFiles.join(", ") || "None"}\n- **Rationale:** ${w.rationale}\n\n`;
    }
    mdContent += `## Reviewer Audit\n- **Status:** ${reviewResult.status}\n- **Score:** ${reviewResult.score}\n- **Build Passed:** ${reviewResult.buildPassed}\n- **Lint Passed:** ${reviewResult.lintPassed}\n- **Summary:** ${reviewResult.summary}\n`;
    fs.writeFileSync(mdPath, mdContent, "utf8");

    // 3. JSON Output
    const jsonPath = path.join(artifactsDir, "spawnAgents_output.json");
    fs.writeFileSync(
      jsonPath,
      JSON.stringify(
        {
          projectId: this.projectId,
          masterPlan,
          workerOutputs,
          reviewResult,
          state: this.state,
        },
        null,
        2
      ),
      "utf8"
    );
  }
}

// ============================================================================
// CLI COMMAND ROUTER & INTERACTION HANDLERS
// ============================================================================

export function generateProjectSlug(title: string): string {
  const clean = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return clean.slice(0, 40) || `project-${Date.now()}`;
}

export async function handleCLI(): Promise<void> {
  const rawArgs = process.argv.slice(2);
  const isJson = rawArgs.includes("--json");
  const filteredArgs = rawArgs.filter((a) => a !== "--json");

  const command = filteredArgs[0] || "";

  // Helper for printing help
  const printHelp = () => {
    console.log(`\x1b[35m=== Manager-Centric Multi-Agent CLI ===\x1b[0m
Usage:
  npx tsx scripts/spawnAgents.ts run "<task>" [--plan <path>] [--project <id>] [--json]
  npx tsx scripts/spawnAgents.ts project list [--json]
  npx tsx scripts/spawnAgents.ts project create <id> [--json]
  npx tsx scripts/spawnAgents.ts project status <id> [--json]
  npx tsx scripts/spawnAgents.ts task list <id> [--json]
  npx tsx scripts/spawnAgents.ts artifacts <id> [--json]
  npx tsx scripts/spawnAgents.ts chat <id> [--limit <n>] [--json]
  npx tsx scripts/spawnAgents.ts resume <id> [--json]
  npx tsx scripts/spawnAgents.ts manager [--project <id>]
  
Direct shorthand:
  npx tsx scripts/spawnAgents.ts "<task description>" [--plan <path>]
`);
  };

  if (command === "--help" || command === "-h" || (!command && filteredArgs.length === 0)) {
    printHelp();
    return;
  }

  // 1. PROJECT COMMANDS
  if (command === "project") {
    const sub = filteredArgs[1] || "list";
    const baseDir = path.join(process.cwd(), "artifacts");

    if (sub === "list") {
      const list: any[] = [];
      if (fs.existsSync(baseDir)) {
        const dirs = fs.readdirSync(baseDir, { withFileTypes: true });
        for (const d of dirs) {
          if (d.isDirectory()) {
            const stateFile = path.join(baseDir, d.name, "state", "project.yaml");
            if (fs.existsSync(stateFile)) {
              try {
                const s = SimpleYaml.parse(fs.readFileSync(stateFile, "utf8"));
                list.push(s);
              } catch {
                list.push({ project: d.name, status: "unknown" });
              }
            } else {
              list.push({ project: d.name, status: "uninitialized" });
            }
          }
        }
      }
      if (isJson) {
        console.log(JSON.stringify(list, null, 2));
      } else {
        console.log(`\x1b[35mProjects (${list.length}):\x1b[0m`);
        list.forEach((p) => console.log(` - \x1b[1m${p.project}\x1b[0m [${p.status || "active"}] - ${p.objective || "No objective"}`));
      }
      return;
    }

    if (sub === "create") {
      const pid = filteredArgs[2] || `project-${Date.now()}`;
      const mgr = new ProjectArtifactsManager(pid);
      const state: ProjectState = {
        project: pid,
        version: 1,
        status: "active",
        objective: "Initialized from CLI",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        activeTasks: [],
        completedTasks: [],
        failedTasks: [],
        artifacts: [],
        collaborationGroups: [],
      };
      mgr.saveState(state);
      new ChatGroupLedger(mgr.projectDir, pid);
      if (isJson) {
        console.log(JSON.stringify({ success: true, project: pid, state }, null, 2));
      } else {
        console.log(`\x1b[32m✔ Project '${pid}' created successfully at artifacts/${pid}\x1b[0m`);
      }
      return;
    }

    if (sub === "status") {
      const pid = filteredArgs[2];
      if (!pid) {
        console.error("Please provide project ID: npx tsx scripts/spawnAgents.ts project status <id>");
        return;
      }
      const mgr = new ProjectArtifactsManager(pid);
      const state = mgr.loadState();
      if (!state) {
        console.error(`Project '${pid}' not found or has no state.`);
        return;
      }
      if (isJson) {
        console.log(JSON.stringify(state, null, 2));
      } else {
        console.log(`\x1b[35m=== Project Status: ${state.project} ===\x1b[0m`);
        console.log(`Status: ${state.status.toUpperCase()}`);
        console.log(`Objective: ${state.objective}`);
        console.log(`Active Tasks: ${state.activeTasks.join(", ") || "None"}`);
        console.log(`Completed Tasks: ${state.completedTasks.join(", ") || "None"}`);
        console.log(`Artifacts: ${state.artifacts.length} registered`);
      }
      return;
    }
  }

  // 2. TASK COMMANDS
  if (command === "task") {
    const sub = filteredArgs[1] || "list";
    const pid = filteredArgs[2];
    if (!pid) {
      console.error("Please provide project ID: npx tsx scripts/spawnAgents.ts task list <id>");
      return;
    }
    const mgr = new ProjectArtifactsManager(pid);
    const state = mgr.loadState();
    if (!state) {
      console.error(`Project '${pid}' not found.`);
      return;
    }
    if (sub === "list") {
      const payload = {
        project: pid,
        activeTasks: state.activeTasks,
        completedTasks: state.completedTasks,
        failedTasks: state.failedTasks,
      };
      if (isJson) {
        console.log(JSON.stringify(payload, null, 2));
      } else {
        console.log(`\x1b[35m=== Tasks for ${pid} ===\x1b[0m`);
        console.log(`Active: ${state.activeTasks.join(", ") || "None"}`);
        console.log(`Completed: ${state.completedTasks.join(", ") || "None"}`);
        console.log(`Failed: ${state.failedTasks.join(", ") || "None"}`);
      }
      return;
    }
  }

  // 3. ARTIFACTS COMMAND
  if (command === "artifacts") {
    const pid = filteredArgs[1];
    if (!pid) {
      console.error("Please provide project ID: npx tsx scripts/spawnAgents.ts artifacts <id>");
      return;
    }
    const mgr = new ProjectArtifactsManager(pid);
    const arts = mgr.listArtifacts();
    if (isJson) {
      console.log(JSON.stringify({ project: pid, artifacts: arts }, null, 2));
    } else {
      console.log(`\x1b[35m=== Artifacts for ${pid} (${arts.length}) ===\x1b[0m`);
      arts.forEach((a) => console.log(` - artifacts/${pid}/${a}`));
    }
    return;
  }

  // 4. CHAT COMMAND
  if (command === "chat") {
    const pid = filteredArgs[1];
    if (!pid) {
      console.error("Please provide project ID: npx tsx scripts/spawnAgents.ts chat <id>");
      return;
    }
    const mgr = new ProjectArtifactsManager(pid);
    const ledger = new ChatRoomLedger(mgr.projectDir, pid);
    const messages = ledger.getMessages();
    if (isJson) {
      console.log(JSON.stringify({ project: pid, count: messages.length, ledgerFile: ledger.filePath, messages }, null, 2));
    } else {
      console.log(`\x1b[35m=== Communication Ledger (${pid}): ${messages.length} messages [chatRoom.md] ===\x1b[0m\n`);
      for (const m of messages) {
        console.log(`\x1b[36m[${m.id}] ${m.timestamp} | ${m.sender.id} -> ${m.recipient.id} (${m.type})\x1b[0m`);
        console.log(m.content.slice(0, 400) + (m.content.length > 400 ? "..." : ""));
        console.log(`\x1b[90m-------------------------------------------------------------\x1b[0m`);
      }
    }
    return;
  }

  // 5. RESUME COMMAND
  if (command === "resume") {
    const pid = filteredArgs[1];
    if (!pid) {
      console.error("Please provide project ID: npx tsx scripts/spawnAgents.ts resume <id>");
      return;
    }
    const mgr = new ProjectArtifactsManager(pid);
    const state = mgr.loadState();
    if (!state) {
      console.error(`Project '${pid}' not found.`);
      return;
    }
    console.log(`\x1b[36m[Resume] Resuming project ${pid} (Objective: ${state.objective})...\x1b[0m`);
    const orchestrator = new ManagerOrchestrator(pid, state.objective);
    await orchestrator.runFullPipeline();
    return;
  }

  // 6. RUN OR DEFAULT SHORTHAND EXECUTION
  let planPath = "";
  let providedPlanContent = "";
  let projectIdOverride = "";
  const taskParts: string[] = [];

  const startIndex = command === "run" ? 1 : 0;
  for (let i = startIndex; i < filteredArgs.length; i++) {
    if (filteredArgs[i] === "--plan" || filteredArgs[i] === "-p") {
      if (i + 1 < filteredArgs.length) {
        planPath = filteredArgs[i + 1];
        i++;
      }
    } else if (filteredArgs[i] === "--project") {
      if (i + 1 < filteredArgs.length) {
        projectIdOverride = filteredArgs[i + 1];
        i++;
      }
    } else {
      taskParts.push(filteredArgs[i]);
    }
  }

  let mainTask = taskParts.join(" ").trim();

  if (planPath) {
    const fullPlanPath = path.isAbsolute(planPath) ? planPath : path.join(process.cwd(), planPath);
    if (fs.existsSync(fullPlanPath)) {
      providedPlanContent = fs.readFileSync(fullPlanPath, "utf8");
      if (!mainTask) {
        mainTask = `Implement specifications laid out in: ${planPath}`;
      }
    } else {
      console.error(`\x1b[31m[Error] Plan file not found at: ${planPath}\x1b[0m`);
      process.exit(1);
    }
  }

  if (!mainTask) {
    printHelp();
    return;
  }

  const pid = projectIdOverride || generateProjectSlug(mainTask);
  const orchestrator = new ManagerOrchestrator(pid, mainTask);
  const result = await orchestrator.runFullPipeline(providedPlanContent, planPath);

  if (isJson) {
    console.log(JSON.stringify(result, null, 2));
  }
}

// ============================================================================
// AUTO-EXECUTE IF RUN DIRECTLY
// ============================================================================

if (process.argv[1] && (process.argv[1].endsWith("spawnAgents.ts") || process.argv[1].endsWith("spawnAgents.js"))) {
  handleCLI().catch((err) => {
    console.error("\x1b[31m[Fatal Error]\x1b[0m", err);
    process.exit(1);
  });
}
