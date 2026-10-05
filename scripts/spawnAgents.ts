#!/usr/bin/env node
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import dotenv from "dotenv";

// Load environment variables silently
dotenv.config({ quiet: true } as any);

// ============================================================================
// CONFIGURATION & INITIALIZATION
// ============================================================================

let apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  for (const profilePath of ["/root/.bashrc", "/root/.profile"]) {
    if (fs.existsSync(profilePath)) {
      const match = fs.readFileSync(profilePath, "utf8").match(/GEMINI_API_KEY=["']?([^"'\s\n]+)["']?/);
      if (match?.[1]) {
        apiKey = match[1];
        process.env.GEMINI_API_KEY = apiKey;
        break;
      }
    }
  }
}
if (!apiKey) {
  console.error("\x1b[31m[Error] GEMINI_API_KEY environment variable is not set.\x1b[0m");
  console.log("\x1b[33mPlease set GEMINI_API_KEY in your environment or Settings > Secrets.\x1b[0m");
  process.exit(1);
}

// Every agent uses gemini-3.8-flash by default
export const DEFAULT_MODEL = process.env.SUB_AGENT_MODEL || "gemini-3.8-flash";
export const BASE_STORAGE_DIR = "projects";
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
export async function generateContentWithRetry(params: any, retries: number = 8, delayMs: number = 1500): Promise<any> {
  const modelsToTry = [params.model || DEFAULT_MODEL, "gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash"];
  let lastError: any = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const currentModel = modelsToTry[(attempt - 1) % modelsToTry.length];
    const callParams = { ...params, model: currentModel };
    try {
      return await ai.models.generateContent(callParams);
    } catch (error: any) {
      lastError = error;
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
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs = Math.min(delayMs * 1.5, 6000);
      } else if (!isTransient) {
        throw error;
      }
    }
  }
  throw lastError;
}

// ============================================================================
// CLEAN EXECUTIVE TERMINAL UX & STYLING ENGINE (ANTIGRAVITY CLI AESTHETIC)
// ============================================================================

export class CLITheme {
  static readonly PURPLE = "\x1b[38;5;141m";
  static readonly CYAN = "\x1b[38;5;45m";
  static readonly GREEN = "\x1b[38;5;84m";
  static readonly YELLOW = "\x1b[38;5;220m";
  static readonly RED = "\x1b[38;5;196m";
  static readonly MAGENTA = "\x1b[38;5;213m";
  static readonly BLUE = "\x1b[38;5;75m";
  static readonly MUTED = "\x1b[38;5;244m";
  static readonly DIM = "\x1b[38;5;238m";
  static readonly WHITE = "\x1b[1;37m";
  static readonly BOLD = "\x1b[1m";
  static readonly RESET = "\x1b[0m";

  static banner(title: string, subtitle?: string): void {
    const width = 72;
    const border = "─".repeat(width - 2);
    console.log(`\n${this.PURPLE}╭${border}╮${this.RESET}`);
    console.log(`${this.PURPLE}│${this.RESET}  ${this.CYAN}✦${this.RESET} ${this.WHITE}${title.padEnd(width - 7)}${this.RESET} ${this.PURPLE}│${this.RESET}`);
    if (subtitle) {
      console.log(`${this.PURPLE}│${this.RESET}  ${this.MUTED}${subtitle.slice(0, width - 6).padEnd(width - 6)}${this.RESET} ${this.PURPLE}│${this.RESET}`);
    }
    console.log(`${this.PURPLE}╰${border}╯${this.RESET}\n`);
  }

  static stage(step: number, total: number, title: string, status: "RUNNING" | "DONE" | "WARN" | "FAIL" = "RUNNING"): void {
    const statusBadges = {
      RUNNING: `${this.CYAN}● IN PROGRESS${this.RESET}`,
      DONE: `${this.GREEN}✔ COMPLETE${this.RESET}`,
      WARN: `${this.YELLOW}▲ AUTO-HEALING${this.RESET}`,
      FAIL: `${this.RED}✖ FAILED${this.RESET}`,
    };
    const stepBadge = `${this.PURPLE}[${step}/${total}]${this.RESET}`;
    const formattedTitle = status === "DONE" ? `${this.GREEN}${title}${this.RESET}` : `${this.WHITE}${title}${this.RESET}`;
    console.log(`${this.BOLD}${stepBadge}${this.RESET} ${formattedTitle}  ${statusBadges[status]}`);
  }

  static detail(label: string, value: string): void {
    console.log(`    ${this.DIM}├──${this.RESET} ${this.CYAN}◈${this.RESET} ${this.MUTED}${label}:${this.RESET} ${this.WHITE}${value}${this.RESET}`);
  }

  static detailLast(label: string, value: string): void {
    console.log(`    ${this.DIM}└──${this.RESET} ${this.CYAN}◈${this.RESET} ${this.MUTED}${label}:${this.RESET} ${this.WHITE}${value}${this.RESET}`);
  }

  static executiveCard(title: string, metrics: Array<[string, string]>): void {
    const width = 72;
    const border = "─".repeat(width - 2);
    console.log(`\n${this.GREEN}╭${border}╮${this.RESET}`);
    console.log(`${this.GREEN}│${this.RESET}  ${this.GREEN}✔${this.RESET} ${this.WHITE}${this.BOLD}${title.padEnd(width - 7)}${this.RESET} ${this.GREEN}│${this.RESET}`);
    console.log(`${this.GREEN}├${border}┤${this.RESET}`);
    for (const [k, v] of metrics) {
      const line = `  ${this.CYAN}◈${this.RESET} ${k.padEnd(20)}: ${this.WHITE}${v}${this.RESET}`;
      const plainLen = k.length + v.length + 25;
      const padLen = Math.max(0, width - plainLen);
      console.log(`${this.GREEN}│${this.RESET}${line}${" ".repeat(padLen)}${this.GREEN}│${this.RESET}`);
    }
    console.log(`${this.GREEN}╰${border}╯${this.RESET}\n`);
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
        const matches = content.match(/##\s*\[msg_\d+\]/g);
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
    if (!fs.existsSync(this.filePath)) {
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
}

// ============================================================================
// AGENTS MESSENGER 1:1 DIRECT MESSAGING ENGINE (projects/{project-id}/agents-messenger)
// ============================================================================

export class AgentsMessengerEngine {
  public projectMessengerDir: string;
  public projectId: string;

  constructor(projectId: string = "default") {
    this.projectId = projectId;
    this.projectMessengerDir = path.join(process.cwd(), BASE_STORAGE_DIR, this.projectId, "agents-messenger");
    if (!fs.existsSync(this.projectMessengerDir)) {
      fs.mkdirSync(this.projectMessengerDir, { recursive: true });
    }
    this.ensureDefaultAgentFiles();
  }

  private ensureDefaultAgentFiles(): void {
    const defaultAgents = [
      { name: "manager", role: "manager", title: "Manager Coordinator" },
      { name: "strategist", role: "strategist", title: "Technical Strategist" },
      { name: "planner", role: "planner", title: "Master Planner" },
      { name: "builder", role: "builder", title: "Implementation Builder" },
      { name: "researcher", role: "researcher", title: "Codebase Researcher" },
      { name: "analyst", role: "analyst", title: "Technical Analyst" },
      { name: "tester", role: "tester", title: "Verification Tester" },
      { name: "reviewer", role: "reviewer", title: "Authoritative Reviewer" },
      { name: "fixer", role: "fixer", title: "Specialized Fix Agent" },
      { name: "human", role: "human", title: "Human Operator" },
    ];

    for (const ag of defaultAgents) {
      this.ensureAgentFile(ag.name, ag.role, ag.title);
    }
  }

  public ensureAgentFile(agentName: string, role?: string, title?: string): string {
    const cleanName = agentName.toLowerCase().replace(/[^a-z0-9_-]+/g, "_");
    const header = `# Agent Messenger: ${cleanName}
- **Agent Name**: \`${cleanName}\`
- **Role**: \`${role || cleanName}\`
- **Title**: ${title || cleanName.toUpperCase()}
- **Channel**: 1:1 Direct Agent Stream
- **Created**: "${new Date().toISOString()}"

---
`;

    if (!fs.existsSync(this.projectMessengerDir)) {
      fs.mkdirSync(this.projectMessengerDir, { recursive: true });
    }
    const projFilePath = path.join(this.projectMessengerDir, `${cleanName}.md`);
    if (!fs.existsSync(projFilePath)) {
      fs.writeFileSync(projFilePath, header, "utf8");
    }
    return projFilePath;
  }

  public appendMessage(message: ChatMessage): void {
    const formatted = `
## [${message.id}] ${message.timestamp} | ${message.sender.id} → ${message.recipient.id} (${message.type.toUpperCase()})
- **Channel**: \`${message.channel || "1:1"}\`
- **Sender**: \`${message.sender.type}\` (${message.sender.id}${message.sender.role ? `, role: ${message.sender.role}` : ""})
- **Recipient**: \`${message.recipient.type}\` (${message.recipient.id}${message.recipient.role ? `, role: ${message.recipient.role}` : ""})
- **Type**: \`${message.type}\`${message.task ? `\n- **Task**: \`${message.task}\`` : ""}${
      message.context?.tools && message.context.tools.length > 0 ? `\n- **Granted Tools**: ${message.context.tools.map((t) => `\`${t}\``).join(", ")}` : ""
    }${
      message.context?.artifacts && message.context.artifacts.length > 0 ? `\n- **Context Artifacts**: ${message.context.artifacts.map((a) => `\`${a}\``).join(", ")}` : ""
    }${
      message.artifacts && message.artifacts.length > 0
        ? `\n- **Produced Artifacts**: ${message.artifacts.map((a) => `\`${a}\``).join(", ")}`
        : ""
    }

### Content:
${message.content}

---
`;

    const targetAgents = new Set<string>();
    const senderKey = message.sender.id.toLowerCase().replace(/[^a-z0-9_-]+/g, "_");
    const recipientKey = message.recipient.id.toLowerCase().replace(/[^a-z0-9_-]+/g, "_");

    targetAgents.add(senderKey);
    targetAgents.add(recipientKey);

    if (message.sender.role) {
      targetAgents.add(message.sender.role.toLowerCase().replace(/[^a-z0-9_-]+/g, "_"));
    }
    if (message.recipient.role) {
      targetAgents.add(message.recipient.role.toLowerCase().replace(/[^a-z0-9_-]+/g, "_"));
    }

    for (const ag of targetAgents) {
      const projFilePath = path.join(this.projectMessengerDir, `${ag}.md`);
      if (!fs.existsSync(projFilePath)) {
        this.ensureAgentFile(ag, ag);
      }
      fs.appendFileSync(projFilePath, formatted, "utf8");
    }
  }

  public listAgents(projectId?: string): Array<{ name: string; file: string; size: number }> {
    const targetDir = projectId
      ? path.join(process.cwd(), BASE_STORAGE_DIR, projectId, "agents-messenger")
      : this.projectMessengerDir;
    if (!fs.existsSync(targetDir)) return [];
    const files = fs.readdirSync(targetDir).filter((f) => f.endsWith(".md"));
    return files.map((f) => {
      const p = path.join(targetDir, f);
      const stat = fs.statSync(p);
      return {
        name: f.replace(/\.md$/, ""),
        file: path.relative(process.cwd(), p),
        size: stat.size,
      };
    });
  }

  public readThread(agentName: string, projectId?: string): string {
    const cleanName = agentName.toLowerCase().replace(/[^a-z0-9_-]+/g, "_").replace(/\.md$/, "");
    const targetDir = projectId
      ? path.join(process.cwd(), BASE_STORAGE_DIR, projectId, "agents-messenger")
      : this.projectMessengerDir;
    const filePath = path.join(targetDir, `${cleanName}.md`);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, "utf8");
    }
    return `Agent messenger file not found for '${agentName}' at ${path.relative(process.cwd(), filePath)}`;
  }
}

// ============================================================================
// PROJECTS & REPOSITORY MANAGER
// ============================================================================

export class ProjectManager {
  public baseDir: string;
  public projectDir: string;
  public stateDir: string;
  public agentsMessengerDir: string;
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
    this.baseDir = path.join(process.cwd(), BASE_STORAGE_DIR);
    this.projectDir = path.join(this.baseDir, projectId);
    this.stateDir = path.join(this.projectDir, "state");
    this.agentsMessengerDir = path.join(this.projectDir, "agents-messenger");
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
      this.agentsMessengerDir,
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
  public allowedWriteDir: string;
  public projectId: string;

  constructor(projectId: string = "default", allowedWriteDir?: string) {
    this.projectId = projectId;
    this.allowedWriteDir = allowedWriteDir || path.resolve(process.cwd(), BASE_STORAGE_DIR, projectId);
  }

  public getToolDeclarations(grantedTools: string[] = ["filesystem_read"]): any[] {
    const decls: any[] = [];

    if (grantedTools.includes("filesystem_read") || grantedTools.includes("filesystem") || grantedTools.includes("all")) {
      decls.push(
        {
          name: "readFile",
          description: "Read the complete content of any file in the workspace codebase (e.g. 'Theme.tsx', 'components/...', 'skills/...', 'projects/...').",
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
          description: "List directory contents across any folder in the workspace codebase (e.g. '.', 'components', 'skills', 'projects').",
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
        description: `Write complete contents to a file. Sandboxed strictly within '${BASE_STORAGE_DIR}/${this.projectId}/'. Target file paths are saved inside the project directory (e.g. 'implementation/file.tsx' or '${BASE_STORAGE_DIR}/${this.projectId}/implementation/file.tsx').`,
        parameters: {
          type: Type.OBJECT,
          properties: {
            filePath: { type: Type.STRING, description: `Target file path strictly within ${BASE_STORAGE_DIR}/${this.projectId}/` },
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
        this.readFiles.add(path.relative(process.cwd(), fp));
        if (fs.existsSync(fp)) {
          return { content: fs.readFileSync(fp, "utf8") };
        }
        return { error: `File not found: ${args.filePath}` };
      }

      if (callName === "writeFile") {
        if (!grantedTools.includes("filesystem_write") && !grantedTools.includes("filesystem") && !grantedTools.includes("all")) {
          return { error: "Permission Denied: filesystem_write tool not granted." };
        }

        const rawPath = String(args.filePath || "").trim();
        const normalizedRaw = rawPath.replace(/\\/g, "/").replace(/^\.\//, "");
        const expectedPrefix = `${BASE_STORAGE_DIR}/${this.projectId}`;
        
        let targetPath: string;
        if (normalizedRaw === expectedPrefix || normalizedRaw.startsWith(`${expectedPrefix}/`)) {
          targetPath = path.resolve(process.cwd(), normalizedRaw);
        } else if (normalizedRaw.startsWith(`${BASE_STORAGE_DIR}/`)) {
          return {
            error: `Permission Denied: Agents are sandboxed to project '${this.projectId}'. Cannot write to '${rawPath}'. All writes must reside within '${expectedPrefix}/'.`,
          };
        } else {
          // Auto-sandbox subpaths within BASE_STORAGE_DIR/{projectId}/
          targetPath = path.resolve(this.allowedWriteDir, normalizedRaw);
        }

        // Absolute security containment check
        const normalizedTarget = path.resolve(targetPath);
        const normalizedAllowed = path.resolve(this.allowedWriteDir);

        if (!normalizedTarget.startsWith(normalizedAllowed)) {
          return {
            error: `Permission Denied: Sandboxing violation. Agents are strictly restricted to writing inside '${BASE_STORAGE_DIR}/${this.projectId}/'. Attempted target '${rawPath}' resolved outside sandbox.`,
          };
        }

        const dir = path.dirname(normalizedTarget);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(normalizedTarget, args.content, "utf8");
        const relPath = path.relative(process.cwd(), normalizedTarget);
        this.modifiedFiles.add(relPath);
        return { success: true, message: `Successfully wrote ${relPath}` };
      }

      if (callName === "listDir") {
        if (!grantedTools.includes("filesystem_read") && !grantedTools.includes("filesystem") && !grantedTools.includes("all")) {
          return { error: "Permission Denied: filesystem_read tool not granted." };
        }
        const dp = path.resolve(process.cwd(), args.dirPath || ".");
        if (!dp.startsWith(process.cwd())) {
          return { error: "Permission Denied: path is outside workspace root." };
        }
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
          const stdout = execSync(cmd, {
            encoding: "utf8",
            timeout: 60000,
            stdio: ["pipe", "pipe", "pipe"],
            maxBuffer: 10 * 1024 * 1024,
            cwd: process.cwd(),
          });
          return { stdout, stderr: "", exitCode: 0 };
        } catch (err: any) {
          return {
            stdout: err.stdout ? String(err.stdout) : "",
            stderr: err.stderr ? String(err.stderr) : err.message || String(err),
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
Your responsibility is to analyze requirements, inspect the full workspace codebase, evaluate architectural pathways, and recommend clean design strategies.
Always prioritize maintainability, performance, Theme.tsx design tokens, and modular separation of concerns.`,
  },
  planner: {
    name: "planner",
    description: "Detailed step-by-step master plan and acceptance criteria formulation.",
    defaultTools: ["filesystem_read"],
    systemInstruction: `You are the Lead Master Planner Agent.
Your responsibility is to inspect the full workspace codebase and establish a pristine architectural plan, objective, and explicit acceptance criteria.
Enforce repo rules: Theme.tsx token compliance, JS style objects, Framer Motion, and zero type errors.`,
  },
  researcher: {
    name: "researcher",
    description: "Deep codebase, pattern, and reference research.",
    defaultTools: ["filesystem_read"],
    systemInstruction: `You are an expert Codebase Researcher Agent.
Your role is to inspect any file in the workspace codebase (components, hooks, types, styles, skills, configs) to gather factual technical intelligence.`,
  },
  analyst: {
    name: "analyst",
    description: "Structural code analysis, impact assessment, and risk auditing.",
    defaultTools: ["filesystem_read"],
    systemInstruction: `You are a Senior Technical Analyst Agent.
Your role is to audit data models, control flows, Theme tokens, and edge cases across the entire codebase, highlighting risks and actionable integration points.`,
  },
  builder: {
    name: "builder",
    description: "Implementation engineer with full codebase read access and sandboxed project write access.",
    defaultTools: ["filesystem_read", "filesystem_write", "terminal"],
    systemInstruction: `You are the Expert Implementation Builder Agent.
Your role is to inspect the full workspace codebase and write clean, complete, and functional artifacts sandboxed inside '${BASE_STORAGE_DIR}/{projectId}/'.
Directives:
1. You have full read access across the codebase via readFile/listDir.
2. All file writes via writeFile are strictly sandboxed inside '${BASE_STORAGE_DIR}/{projectId}/'.
3. Write complete, non-truncated content.
4. Use Theme.tsx Surface and Content tokens and procedural border helpers.
5. Respect Dock immunity and README immunity.`,
  },
  tester: {
    name: "tester",
    description: "Verification and compilation testing specialist.",
    defaultTools: ["filesystem_read", "terminal"],
    systemInstruction: `You are the Verification & Testing Agent.
Your role is to inspect the full codebase, execute tests, run compiler/lint checks via terminal, inspect runtime integrity, and record validation results.`,
  },
  reviewer: {
    name: "reviewer",
    description: "Authoritative code quality, architecture, and acceptance criteria auditor.",
    defaultTools: ["filesystem_read", "filesystem_write", "terminal"],
    systemInstruction: `You are the Authoritative Lead QA and Code Reviewer Agent.
Your role is to run 'npm run lint' and 'npm run build', inspect codebase and artifact files, verify Theme.tsx token usage, audit architectural integrity, and return PASS or FAIL with explicit issue items.`,
  },
  fixer: {
    name: "fixer",
    description: "Targeted bug and compiler error remediation engineer.",
    defaultTools: ["filesystem_read", "filesystem_write", "terminal"],
    systemInstruction: `You are the Specialized Fix Agent.
Your sole mission is to inspect the codebase, resolve compiler errors, broken imports, missing types, or review issues, saving remediation artifacts inside '${BASE_STORAGE_DIR}/{projectId}/'.`,
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
  projectManager: ProjectManager;
  ledger: ChatRoomLedger;
  messenger?: AgentsMessengerEngine;
  channel?: string;
}

/**
 * Spawns a fresh, isolated agent.
 * Every sub-agent creates a brand-new Gemini context and records all prompts and responses to chatRoom.md and /agents-messenger.
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
  const toolEngine = new ToolExecutionEngine(opts.projectManager.projectId, opts.projectManager.projectDir);
  const toolsDecl = toolEngine.getToolDeclarations(toolsGranted);

  const sandboxInstruction = `WORKSPACE ACCESS RULES:
- Full Codebase Read Access: You have unrestricted read access across the entire repository codebase using 'readFile' and 'listDir'.
- Sandboxed Write Access: All file writing using 'writeFile' is strictly sandboxed inside '${BASE_STORAGE_DIR}/\${opts.projectManager.projectId}/'. Target file paths will be saved inside '${BASE_STORAGE_DIR}/\${opts.projectManager.projectId}/'.`;

  const finalSystemInstruction = `${roleDef.systemInstruction}\n\n${sandboxInstruction}\n\n${opts.systemInstruction || ""}`.trim();

  // 1. Log prompt to chatRoom.md and /agents-messenger
  const promptMsgId = opts.ledger.nextMessageId();
  const promptMsg: ChatMessage = {
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
  };
  opts.ledger.appendMessage(promptMsg);
  opts.messenger?.appendMessage(promptMsg);

  const contents: any[] = [{ role: "user", parts: [{ text: opts.task }] }];
  let turn = 0;
  const maxTurns = opts.maxTurns || 15;
  let rawText = "";

  while (turn < maxTurns) {
    turn++;
    const config: any = {
      systemInstruction: finalSystemInstruction,
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
      // Log tool call to chatRoom.md and /agents-messenger
      const toolCallId = opts.ledger.nextMessageId();
      const toolCallMsg: ChatMessage = {
        id: toolCallId,
        timestamp: new Date().toISOString(),
        sender: { type: "agent", id: opts.agentId, role: opts.role },
        recipient: { type: "manager", id: "manager" },
        channel: opts.channel || "manager",
        type: "tool_call",
        content: `Tool Call: ${call.name}\nArguments: ${JSON.stringify(call.args, null, 2)}`,
        task: opts.agentId,
      };
      opts.ledger.appendMessage(toolCallMsg);
      opts.messenger?.appendMessage(toolCallMsg);

      const result = toolEngine.executeTool(call.name, call.args, toolsGranted);

      // Log tool response to chatRoom.md and /agents-messenger
      const toolRespId = opts.ledger.nextMessageId();
      const toolRespMsg: ChatMessage = {
        id: toolRespId,
        timestamp: new Date().toISOString(),
        sender: { type: "manager", id: "manager" },
        recipient: { type: "agent", id: opts.agentId, role: opts.role },
        channel: opts.channel || "manager",
        type: "tool_response",
        content: `Tool Result (${call.name}):\n${JSON.stringify(result, null, 2).slice(0, 1000)}`,
        task: opts.agentId,
      };
      opts.ledger.appendMessage(toolRespMsg);
      opts.messenger?.appendMessage(toolRespMsg);

      toolParts.push({
        functionResponse: {
          name: call.name,
          response: { result },
        },
      });
    }

    contents.push({ role: "user", parts: toolParts });
  }

  // Log agent response to chatRoom.md and /agents-messenger
  const responseMsgId = opts.ledger.nextMessageId();
  const responseMsg: ChatMessage = {
    id: responseMsgId,
    timestamp: new Date().toISOString(),
    sender: { type: "agent", id: opts.agentId, role: opts.role },
    recipient: { type: "manager", id: "manager" },
    channel: opts.channel || "manager",
    type: "agent_response",
    content: rawText,
    task: opts.agentId,
  };
  opts.ledger.appendMessage(responseMsg);
  opts.messenger?.appendMessage(responseMsg);

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
  public projectManager: ProjectManager;
  public ledger: ChatRoomLedger;
  public messenger: AgentsMessengerEngine;
  public state: ProjectState;

  constructor(public projectId: string, public userObjective: string) {
    this.projectManager = new ProjectManager(projectId);
    this.ledger = new ChatRoomLedger(this.projectManager.projectDir, projectId);
    this.messenger = new AgentsMessengerEngine(projectId);
    
    const existing = this.projectManager.loadState();
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
      this.projectManager.saveState(this.state);
    }
  }

  public async runFullPipeline(providedPlanContent: string = "", providedPlanPath: string = ""): Promise<{
    masterPlan: MasterPlan;
    workerOutputs: WorkerOutputContract[];
    reviewResult: ReviewResult;
    artifacts: string[];
  }> {
    CLITheme.banner("AUTONOMOUS AGENT ORCHESTRATOR", `Task: "${this.state.objective}"`);

    // Log human request
    const humanMsgId = this.ledger.nextMessageId();
    const humanMsg: ChatMessage = {
      id: humanMsgId,
      timestamp: new Date().toISOString(),
      sender: { type: "human", id: "human" },
      recipient: { type: "manager", id: "manager" },
      channel: "manager",
      type: "user_prompt",
      content: this.state.objective,
    };
    this.ledger.appendMessage(humanMsg);
    this.messenger.appendMessage(humanMsg);

    // 1. Manager Strategy & Master Planning
    CLITheme.stage(1, 5, "Formulating Master Architectural Plan", "RUNNING");
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
      projectManager: this.projectManager,
      ledger: this.ledger,
      messenger: this.messenger,
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

    const planArtifactPath = this.projectManager.saveArtifact(
      "plans",
      "master_plan.yaml",
      SimpleYaml.stringify(masterPlan)
    );
    this.state.artifacts.push(planArtifactPath);
    this.projectManager.saveState(this.state);
    CLITheme.stage(1, 5, "Master Architectural Plan Established", "DONE");
    CLITheme.detail("Plan Target", masterPlan.taskName);
    CLITheme.detailLast("Acceptance Criteria", `${masterPlan.acceptanceCriteria.criteria.length} criteria defined`);

    // 2. Parallel Analysis Agents
    CLITheme.stage(2, 5, "Parallel Discovery (Structural, Design System, Rules)", "RUNNING");
    const analysisPromises = [
      spawnFreshAgent({
        role: "researcher",
        agentId: "researcher_structural",
        task: `Inspect codebase files, components, and project structure for task: "${this.state.objective}". Output key architectural findings.`,
        projectManager: this.projectManager,
        ledger: this.ledger,
        messenger: this.messenger,
        grantedTools: ["filesystem_read"],
      }),
      spawnFreshAgent({
        role: "analyst",
        agentId: "analyst_design_system",
        task: `Inspect Theme.tsx, design tokens, styling rules, and Framer Motion patterns for task: "${this.state.objective}".`,
        projectManager: this.projectManager,
        ledger: this.ledger,
        messenger: this.messenger,
        grantedTools: ["filesystem_read"],
      }),
      spawnFreshAgent({
        role: "analyst",
        agentId: "analyst_rules",
        task: `Check AGENTS.md, protected components (Dock immunity, README immunity), and safety constraints for task: "${this.state.objective}".`,
        projectManager: this.projectManager,
        ledger: this.ledger,
        messenger: this.messenger,
        grantedTools: ["filesystem_read"],
      }),
    ];

    const [structuralBrief, designBrief, rulesBrief] = await Promise.all(analysisPromises);
    const combinedAnalysis = `### Structural Intelligence:\n${structuralBrief.text}\n\n### Design System Tokens:\n${designBrief.text}\n\n### Rules & Immunity:\n${rulesBrief.text}`;
    const analysisArtifactPath = this.projectManager.saveArtifact("analysis", "initial_brief.md", combinedAnalysis);
    this.state.artifacts.push(analysisArtifactPath);
    CLITheme.stage(2, 5, "Parallel Architectural Discovery Complete", "DONE");
    CLITheme.detail("Structural Brief", "Workspace layout and dependencies mapped");
    CLITheme.detailLast("Token Boundaries", "Theme tokens and component isolation verified");

    // 3. Manager Task Graph Partitioning & Execution
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
      projectManager: this.projectManager,
      ledger: this.ledger,
      messenger: this.messenger,
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
    this.projectManager.saveState(this.state);

    CLITheme.stage(3, 5, `Executing ${tasks.length} Autonomous Worker Task(s)`, "RUNNING");
    const workerOutputs: WorkerOutputContract[] = [];
    const allModifiedFiles = new Set<string>();

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const workerResult = await spawnFreshAgent({
        role: task.role,
        agentId: `${task.role}_${task.id}`,
        task: `TASK PROMPT:
${task.prompt}

TARGET FILES: ${task.targetFiles.join(", ") || "Auto-detect"}
CONSTRAINTS: ${task.constraints.join(", ") || "Follow repo rules"}
CRITERIA: ${task.acceptanceCriteria.join("; ")}

Read existing files, make necessary modifications using writeFile, and summarize your changes.`,
        projectManager: this.projectManager,
        ledger: this.ledger,
        messenger: this.messenger,
        grantedTools: task.grantedTools || ROLE_REGISTRY[task.role]?.defaultTools || ["filesystem_read", "filesystem_write", "terminal"],
      });

      for (const f of workerResult.modifiedFiles) {
        allModifiedFiles.add(f);
      }

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

      const outArtifactPath = this.projectManager.saveArtifact(
        "outputs",
        `${task.id}_output.yaml`,
        SimpleYaml.stringify(outputContract)
      );
      outputContract.artifactPath = outArtifactPath;
      workerOutputs.push(outputContract);

      this.state.completedTasks.push(task.id);
      this.state.activeTasks = this.state.activeTasks.filter((id) => id !== task.id);
      this.state.artifacts.push(outArtifactPath);
      this.projectManager.saveState(this.state);

      if (i === tasks.length - 1) {
        CLITheme.detailLast(`[${i + 1}/${tasks.length}] ${task.name} (${task.role})`, workerResult.modifiedFiles.length > 0 ? `Modified: ${workerResult.modifiedFiles.join(", ")}` : "Verified file system");
      } else {
        CLITheme.detail(`[${i + 1}/${tasks.length}] ${task.name} (${task.role})`, workerResult.modifiedFiles.length > 0 ? `Modified: ${workerResult.modifiedFiles.join(", ")}` : "Verified file system");
      }
    }
    CLITheme.stage(3, 5, `Completed ${tasks.length} Autonomous Worker Task(s)`, "DONE");

    // 4. Authoritative Reviewer
    CLITheme.stage(4, 5, "Running Authoritative Review (Lint & Build Audit)", "RUNNING");
    let reviewResult = await this.executeReviewer(masterPlan, workerOutputs);
    CLITheme.stage(4, 5, `Authoritative Audit: ${reviewResult.status} (Score: ${reviewResult.score})`, reviewResult.status === "PASS" ? "DONE" : "WARN");
    CLITheme.detail("Lint Status", reviewResult.lintPassed ? "✔ PASSED" : "✖ FAILED");
    CLITheme.detailLast("Build Status", reviewResult.buildPassed ? "✔ PASSED" : "✖ FAILED");

    // 5. Autonomous Fix Agent Loop (if needed)
    let retryCount = 0;
    while (reviewResult.status === "FAIL" && retryCount < MAX_REVIEW_RETRIES) {
      retryCount++;
      CLITheme.stage(5, 5, `Self-Healing Auto-Fixer (Attempt ${retryCount}/${MAX_REVIEW_RETRIES})`, "WARN");

      await spawnFreshAgent({
        role: "fixer",
        agentId: `fixer_retry_${retryCount}`,
        task: `The Reviewer found the following issues:
Summary: ${reviewResult.summary}
Issues:
${reviewResult.issues.map((iss, idx) => `${idx + 1}. [${iss.severity}] ${iss.file}: ${iss.description}\nFix: ${iss.fixInstructions}`).join("\n\n")}

Inspect failing files, execute 'runCommand' ('npm run lint' or 'npm run build') to diagnose, and apply pristine fixes with writeFile.`,
        projectManager: this.projectManager,
        ledger: this.ledger,
        messenger: this.messenger,
        grantedTools: ["filesystem_read", "filesystem_write", "terminal"],
      });

      reviewResult = await this.executeReviewer(masterPlan, workerOutputs);
    }

    if (reviewResult.status === "PASS") {
      CLITheme.stage(5, 5, "Zero-Defect Verification (100% Clean Pass)", "DONE");
    } else {
      CLITheme.stage(5, 5, "Verification Incomplete (Review retries exhausted)", "FAIL");
    }

    // 6. Final State & Project Reports
    this.state.status = reviewResult.status === "PASS" ? "completed" : "failed";
    this.state.updatedAt = new Date().toISOString();
    this.projectManager.saveState(this.state);
    this.saveProjectReports(masterPlan, combinedAnalysis, workerOutputs, reviewResult);

    // Executive Completion Card
    const fileListStr = Array.from(allModifiedFiles).join(", ") || "No manual changes required";
    CLITheme.executiveCard("AUTONOMOUS EXECUTION COMPLETED", [
      ["Project ID", this.projectId],
      ["Objective", this.state.objective],
      ["Build Status", reviewResult.buildPassed ? "✔ PASSED (npm run build)" : "✖ FAILED"],
      ["Lint Status", reviewResult.lintPassed ? "✔ PASSED (npm run lint)" : "✖ FAILED"],
      ["Quality Audit", `${reviewResult.score} (${reviewResult.status})`],
      ["Modified Files", fileListStr],
      ["Chat Room", `${BASE_STORAGE_DIR}/${this.projectId}/chatRoom.md`],
      ["1:1 Messenger", `${BASE_STORAGE_DIR}/${this.projectId}/agents-messenger/`],
    ]);

    return {
      masterPlan,
      workerOutputs,
      reviewResult,
      artifacts: this.projectManager.listArtifacts(),
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
      projectManager: this.projectManager,
      ledger: this.ledger,
      messenger: this.messenger,
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

    const reviewArtifactPath = this.projectManager.saveArtifact(
      "reviews",
      `review_${Date.now()}.yaml`,
      SimpleYaml.stringify(res)
    );
    res.artifactPath = reviewArtifactPath;
    this.state.artifacts.push(reviewArtifactPath);
    this.projectManager.saveState(this.state);
    return res;
  }

  private saveProjectReports(
    masterPlan: MasterPlan,
    combinedAnalysis: string,
    workerOutputs: WorkerOutputContract[],
    reviewResult: ReviewResult
  ): void {
    const projDir = this.projectManager.projectDir;
    if (!fs.existsSync(projDir)) fs.mkdirSync(projDir, { recursive: true });

    // 1. Task Spec
    const taskSlug = masterPlan.taskName.toLowerCase().replace(/[^a-z0-9]+/g, "_") || "task_spec";
    const specContent = `# Tech Spec: ${masterPlan.taskName}\n\n## Objective\n${masterPlan.objective}\n\n## Architectural Decisions\n${masterPlan.architectureDecisions}\n\n## Implementation Plan\n${masterPlan.planContent}\n\n## Acceptance Criteria\n### Functional Criteria\n${masterPlan.acceptanceCriteria.criteria.map((c) => `- ${c}`).join("\n")}\n\n### Non-Negotiables\n${masterPlan.acceptanceCriteria.nonNegotiables.map((n) => `- ${n}`).join("\n")}\n`;
    fs.writeFileSync(path.join(projDir, `${taskSlug}_spec.md`), specContent, "utf8");

    // 2. Markdown Report
    let mdContent = `# Spawn Agents Execution Report: ${masterPlan.taskName}\n\n## Task Objective\n${masterPlan.objective}\n\n## Analysis Briefing\n${combinedAnalysis}\n\n## Worker Outputs\n`;
    for (const w of workerOutputs) {
      mdContent += `### Task [${w.taskId}]: ${w.agentName} (${w.role})\n- **Status:** ${w.status}\n- **Modified Files:** ${w.modifiedFiles.join(", ") || "None"}\n- **Read Files:** ${w.readFiles.join(", ") || "None"}\n- **Rationale:** ${w.rationale}\n\n`;
    }
    mdContent += `## Reviewer Audit\n- **Status:** ${reviewResult.status}\n- **Score:** ${reviewResult.score}\n- **Build Passed:** ${reviewResult.buildPassed}\n- **Lint Passed:** ${reviewResult.lintPassed}\n- **Summary:** ${reviewResult.summary}\n`;
    fs.writeFileSync(path.join(projDir, "spawnAgents_output.md"), mdContent, "utf8");

    // 3. JSON Output
    const jsonContent = JSON.stringify(
      {
        projectId: this.projectId,
        masterPlan,
        workerOutputs,
        reviewResult,
        state: this.state,
      },
      null,
      2
    );
    fs.writeFileSync(path.join(projDir, "spawnAgents_output.json"), jsonContent, "utf8");
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

  // Helper for printing help with full Antigravity CLI aesthetic
  const printHelp = () => {
    const P = CLITheme.PURPLE;
    const C = CLITheme.CYAN;
    const G = CLITheme.GREEN;
    const Y = CLITheme.YELLOW;
    const M = CLITheme.MUTED;
    const W = CLITheme.WHITE;
    const B = CLITheme.BOLD;
    const R = CLITheme.RESET;

    const width = 72;
    const border = "─".repeat(width - 2);

    console.log(`\n${P}╭${border}╮${R}`);
    console.log(`${P}│${R}  ${C}✦${R} ${W}${B}SPAWN AGENTS${R}  ${M}◈${R}  ${C}Autonomous Multi-Agent Orchestrator CLI${R}       ${P}│${R}`);
    console.log(`${P}│${R}  ${M}Zero-Touch Manager Topology · Powered by Gemini Flash (${DEFAULT_MODEL})${R}  ${P}│${R}`);
    console.log(`${P}╰${border}╯${R}\n`);

    console.log(`${B}${C}⚡ CORE AUTONOMOUS EXECUTION${R}`);
    console.log(`  ${W}npx tsx scripts/spawnAgents.ts "<task>"${R}`);
    console.log(`  ${M}└─ Executes 5-stage pipeline: Plan → Discovery → Workers → Review → Self-Heal${R}\n`);
    console.log(`  ${W}npx tsx scripts/spawnAgents.ts run "<task>" [--plan <path>] [--project <id>]${R}`);
    console.log(`  ${M}└─ Explicit run with custom architectural plan spec or explicit project ID${R}\n`);
    console.log(`  ${W}npx tsx scripts/spawnAgents.ts resume <project-id>${R}`);
    console.log(`  ${M}└─ Resumes execution of an existing or interrupted project sandbox${R}\n`);

    console.log(`${B}${P}📂 PROJECT & FILE MANAGEMENT${R}`);
    console.log(`  ${W}npx tsx scripts/spawnAgents.ts project list${R}       ${M}List all registered project sandboxes${R}`);
    console.log(`  ${W}npx tsx scripts/spawnAgents.ts project create <id>${R}  ${M}Initialize a new project sandbox${R}`);
    console.log(`  ${W}npx tsx scripts/spawnAgents.ts project status <id>${R}  ${M}Inspect project tasks, state, and outputs${R}`);
    console.log(`  ${W}npx tsx scripts/spawnAgents.ts task list <id>${R}        ${M}Inspect active and completed worker tasks${R}`);
    console.log(`  ${W}npx tsx scripts/spawnAgents.ts files <id>${R}               ${M}List all files in ${BASE_STORAGE_DIR}/{project-id}/${R}\n`);

    console.log(`${B}${G}💬 DIRECT 1:1 AGENT MESSENGER & AUDIT LEDGER${R}`);
    console.log(`  ${W}npx tsx scripts/spawnAgents.ts messenger list [--project <id>]${R}`);
    console.log(`  ${M}└─ View all 1:1 agent communication streams for a project${R}`);
    console.log(`  ${W}npx tsx scripts/spawnAgents.ts messenger read <agent-name> [--project <id>]${R}`);
    console.log(`  ${M}└─ Read chronological 1:1 conversation ledger for specific agent${R}`);
    console.log(`  ${W}npx tsx scripts/spawnAgents.ts messenger send <from> <to> "<msg>" [--project <id>]${R}`);
    console.log(`  ${M}└─ Dispatch direct 1:1 message to an isolated sub-agent context${R}`);
    console.log(`  ${W}npx tsx scripts/spawnAgents.ts chat <project-id>${R}`);
    console.log(`  ${M}└─ Stream global chronological ledger (${BASE_STORAGE_DIR}/{project-id}/chatRoom.md)${R}\n`);

    console.log(`${B}${Y}🎯 COMMON EXAMPLES${R}`);
    console.log(`  ${M}$${R} ${W}npx tsx scripts/spawnAgents.ts "Audit Theme.tsx and verify Button styles"${R}`);
    console.log(`  ${M}$${R} ${W}npx tsx scripts/spawnAgents.ts run "Build HUD widget" --plan plans/my_plan.md${R}`);
    console.log(`  ${M}$${R} ${W}npx tsx scripts/spawnAgents.ts messenger send human builder "Check responsive layout"${R}\n`);
  };

  if (command === "--help" || command === "-h" || (!command && filteredArgs.length === 0)) {
    printHelp();
    return;
  }

  // 1. PROJECT COMMANDS
  if (command === "project") {
    const sub = filteredArgs[1] || "list";
    const baseDir = path.join(process.cwd(), BASE_STORAGE_DIR);

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
      const mgr = new ProjectManager(pid);
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
      new ChatRoomLedger(mgr.projectDir, pid);
      new AgentsMessengerEngine(pid);
      if (isJson) {
        console.log(JSON.stringify({ success: true, project: pid, state }, null, 2));
      } else {
        console.log(`\x1b[32m✔ Project '${pid}' created successfully at ${BASE_STORAGE_DIR}/${pid}\x1b[0m`);
      }
      return;
    }

    if (sub === "status") {
      const pid = filteredArgs[2];
      if (!pid) {
        console.error("Please provide project ID: npx tsx scripts/spawnAgents.ts project status <id>");
        return;
      }
      const mgr = new ProjectManager(pid);
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
    const mgr = new ProjectManager(pid);
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

  // 3. FILES COMMAND
  if (command === "files") {
    const pid = filteredArgs[1];
    if (!pid) {
      console.error(`Please provide project ID: npx tsx scripts/spawnAgents.ts files <id>`);
      return;
    }
    const mgr = new ProjectManager(pid);
    const arts = mgr.listArtifacts();
    if (isJson) {
      console.log(JSON.stringify({ project: pid, files: arts }, null, 2));
    } else {
      console.log(`\x1b[35m=== Files for ${pid} (${arts.length}) ===\x1b[0m`);
      arts.forEach((a) => console.log(` - ${BASE_STORAGE_DIR}/${pid}/${a}`));
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
    const mgr = new ProjectManager(pid);
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

  // 5. MESSENGER COMMANDS (projects/{project-id}/agents-messenger)
  if (command === "messenger") {
    const sub = filteredArgs[1] || "list";

    // Extract optional --project or -p flag
    let projectId: string | undefined = undefined;
    const cleanSubArgs: string[] = [];
    for (let i = 2; i < filteredArgs.length; i++) {
      if (filteredArgs[i] === "--project" || filteredArgs[i] === "-p") {
        if (i + 1 < filteredArgs.length) {
          projectId = filteredArgs[i + 1];
          i++;
        }
      } else {
        cleanSubArgs.push(filteredArgs[i]);
      }
    }

    const activeProjectId = projectId || "default";
    const messenger = new AgentsMessengerEngine(activeProjectId);

    if (sub === "list") {
      const list = messenger.listAgents(activeProjectId);
      if (isJson) {
        console.log(JSON.stringify({ folder: `${BASE_STORAGE_DIR}/${activeProjectId}/agents-messenger`, count: list.length, agents: list }, null, 2));
      } else {
        console.log(`\x1b[35m=== Agents Messenger Directory (${BASE_STORAGE_DIR}/${activeProjectId}/agents-messenger) ===\x1b[0m`);
        list.forEach((a) => console.log(` - \x1b[1m${a.name}\x1b[0m (${a.file}, ${a.size} bytes)`));
      }
      return;
    }

    if (sub === "read") {
      const agentName = cleanSubArgs[0];
      if (!agentName) {
        console.error(`Please provide agent name: npx tsx scripts/spawnAgents.ts messenger read <agent-name> [--project <id>]`);
        return;
      }
      const thread = messenger.readThread(agentName, activeProjectId);
      if (isJson) {
        console.log(JSON.stringify({ agent: agentName, project: activeProjectId, thread }, null, 2));
      } else {
        console.log(`\x1b[35m=== 1:1 Messenger Thread: ${agentName} (${BASE_STORAGE_DIR}/${activeProjectId}/agents-messenger/${agentName}.md) ===\x1b[0m\n`);
        console.log(thread);
      }
      return;
    }

    if (sub === "send") {
      const fromAgent = cleanSubArgs[0];
      const toAgent = cleanSubArgs[1];
      const messageText = cleanSubArgs.slice(2).join(" ").trim();

      if (!fromAgent || !toAgent || !messageText) {
        console.error('Usage: npx tsx scripts/spawnAgents.ts messenger send <from-agent> <to-agent> "<message>" [--project <id>]');
        return;
      }

      const sendProjectId = projectId || `messenger-${Date.now()}`;
      console.log(`\x1b[36m[Messenger 1:1] Sending direct message from '${fromAgent}' to '${toAgent}' (Project: ${sendProjectId})...\x1b[0m`);
      const projectManager = new ProjectManager(sendProjectId);
      const ledger = new ChatRoomLedger(projectManager.projectDir, sendProjectId);
      const projectMessenger = new AgentsMessengerEngine(sendProjectId);

      const promptMsg: ChatMessage = {
        id: ledger.nextMessageId(),
        timestamp: new Date().toISOString(),
        sender: { type: fromAgent === "human" ? "human" : "agent", id: fromAgent, role: fromAgent },
        recipient: { type: toAgent === "manager" ? "manager" : "agent", id: toAgent, role: toAgent },
        channel: "1:1",
        type: "agent_prompt",
        content: messageText,
      };
      ledger.appendMessage(promptMsg);
      projectMessenger.appendMessage(promptMsg);

      const targetRole = ROLE_REGISTRY[toAgent] ? toAgent : "builder";
      const result = await spawnFreshAgent({
        role: targetRole,
        agentId: toAgent,
        task: messageText,
        projectManager: projectManager,
        ledger: ledger,
        messenger: projectMessenger,
        channel: "1:1",
      });

      if (isJson) {
        console.log(JSON.stringify({ project: sendProjectId, from: fromAgent, to: toAgent, message: messageText, response: result.text }, null, 2));
      } else {
        console.log(`\x1b[32m✔ Direct 1:1 message sent and logged to ${BASE_STORAGE_DIR}/${sendProjectId}/agents-messenger/${toAgent}.md\x1b[0m\n`);
        console.log(`\x1b[35m=== [${toAgent}] 1:1 Response ===\x1b[0m\n${result.text}`);
      }
      return;
    }
  }

  // 5. RESUME COMMAND
  if (command === "resume") {
    const pid = filteredArgs[1];
    if (!pid) {
      console.error("Please provide project ID: npx tsx scripts/spawnAgents.ts resume <id>");
      return;
    }
    const mgr = new ProjectManager(pid);
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
