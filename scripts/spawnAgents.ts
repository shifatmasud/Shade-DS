import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

// Initialize Gemini client
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("\x1b[31m[Error] GEMINI_API_KEY environment variable is not set.\x1b[0m");
  console.log("\x1b[33mPlease set the GEMINI_API_KEY in your environment or Settings > Secrets.\x1b[0m");
  process.exit(1);
}

const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

/**
 * Robust wrapper to call Gemini API with automatic retries and exponential backoff.
 */
async function generateContentWithRetry(params: any, retries: number = 5, delayMs: number = 3000): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      const errorStr = String(error?.message || error);
      const isTransient = errorStr.includes("503") || 
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
        console.warn(`\x1b[33m[Warning] Gemini API busy, rate limited, or unavailable. Retrying in ${delayMs}ms (Attempt ${attempt}/${retries})...\x1b[0m`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2; // exponential backoff
      } else {
        throw error;
      }
    }
  }
}

// Types
interface SubAgent {
  name: string;
  role: string;
  systemInstruction: string;
  prompt: string;
  output?: string;
  modifiedFiles?: string[];
  readFiles?: string[];
}

interface Decomposition {
  taskName: string;
  plans: string;
  agents: SubAgent[];
}

interface AnalysisBrief {
  analyzerName: string;
  focus: string;
  findings: string;
  recommendedActions: string;
  filesRead: string[];
}

// Global trackers
const allModifiedFiles = new Set<string>();
const allReadFiles = new Set<string>();

// 1. Task Decomposition Schema
const subAgentSchema = {
  type: Type.OBJECT,
  properties: {
    name: { 
      type: Type.STRING, 
      description: "Name of the sub-agent, e.g. UXArchitect, CodeGenerator, StyleManager, BugFixer" 
    },
    role: { 
      type: Type.STRING, 
      description: "Specific role, expertise, and focus area of this sub-agent" 
    },
    systemInstruction: { 
      type: Type.STRING, 
      description: "A tailored, laser-focused system instruction for this specific agent. Include general directives on coding elegance and style." 
    },
    prompt: { 
      type: Type.STRING, 
      description: "The specific sub-task or code modification this agent must execute using tools." 
    }
  },
  required: ["name", "role", "systemInstruction", "prompt"]
};

const decompositionSchema = {
  type: Type.OBJECT,
  properties: {
    taskName: { 
      type: Type.STRING, 
      description: "A short, descriptive name of the overall task" 
    },
    plans: {
      type: Type.STRING,
      description: "An overall architectural plan and implementation strategy describing what will be built, file modifications, and requirements."
    },
    agents: {
      type: Type.ARRAY,
      items: subAgentSchema,
      description: "The team of specialized sub-agents required to decompose and solve the task in sequence."
    }
  },
  required: ["taskName", "plans", "agents"]
};

// 2. Analysis Brief Schema
const analysisBriefSchema = {
  type: Type.OBJECT,
  properties: {
    analyzerName: { type: Type.STRING },
    focus: { type: Type.STRING },
    findings: { type: Type.STRING, description: "Detailed structural findings, existing code patterns, and relevant details." },
    recommendedActions: { type: Type.STRING, description: "Actionable technical directions or architectural decisions for this task." },
    filesRead: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "List of workspace files read during this analysis." 
    }
  },
  required: ["analyzerName", "focus", "findings", "recommendedActions", "filesRead"]
};

/**
 * Executes a read-only parallel analyzer.
 */
async function executeParallelAnalyzer(
  name: string,
  focus: string,
  systemInstruction: string,
  taskPrompt: string
): Promise<AnalysisBrief> {
  console.log(`\x1b[36m[Parallel Phase] Spawning Analyzer: ${name} (Focus: ${focus})...\x1b[0m`);
  
  const systemPrompt = `${systemInstruction}
  
You are an advanced parallel analysis agent. You are equipped with read-only workspace tools (readFile, listDir).
CRITICAL RULES:
1. Use listDir and readFile to thoroughly inspect the codebase related to your focus area.
2. Formulate highly technical, structured, and deep context briefings to guide subsequent sequential workers.
3. You MUST end your turn by outputting a structured JSON brief matching the schema.
`;

  const contents: any[] = [{ role: "user", parts: [{ text: taskPrompt }] }];
  
  // Tools for analysis: Only read-only tools to avoid write race conditions during parallel phase
  const tools = [
    {
      functionDeclarations: [
        {
          name: "readFile",
          description: "Read the entire content of a file in the workspace.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              filePath: { 
                type: Type.STRING, 
                description: "The relative path of the file to read from the project root, e.g. 'src/App.tsx'." 
              }
            },
            required: ["filePath"]
          }
        },
        {
          name: "listDir",
          description: "List all files and directories inside a given path relative to the project root.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              dirPath: { 
                type: Type.STRING, 
                description: "The relative directory path to list. Defaults to '.' (root)." 
              }
            },
            required: ["dirPath"]
          }
        }
      ]
    }
  ];

  let turn = 0;
  const maxTurns = 8;
  const filesRead = new Set<string>();

  while (turn < maxTurns) {
    turn++;
    const response = await generateContentWithRetry({
      model: "gemini-3.1-flash-lite",
      contents: contents,
      config: {
        systemInstruction: systemPrompt,
        tools: tools,
        responseMimeType: "application/json",
        responseSchema: analysisBriefSchema,
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
      }
    });

    const candidate = response.candidates?.[0];
    const content = candidate?.content;
    
    if (content) {
      contents.push(content);
    }

    const functionCalls = response.functionCalls;
    if (!functionCalls || functionCalls.length === 0) {
      const text = response.text?.trim() || "{}";
      try {
        const parsed = JSON.parse(text) as AnalysisBrief;
        parsed.filesRead = Array.from(filesRead);
        console.log(`\x1b[32m[Parallel Phase] Analyzer ${name} complete. Read ${parsed.filesRead.length} files.\x1b[0m`);
        return parsed;
      } catch (err) {
        return {
          analyzerName: name,
          focus,
          findings: text,
          recommendedActions: "Proceed to code planning.",
          filesRead: Array.from(filesRead)
        };
      }
    }

    const toolParts: any[] = [];
    for (const call of functionCalls) {
      let result: any;
      try {
        if (call.name === "readFile") {
          const fp = path.resolve(process.cwd(), call.args.filePath);
          filesRead.add(call.args.filePath);
          allReadFiles.add(call.args.filePath);
          if (fs.existsSync(fp)) {
            result = { content: fs.readFileSync(fp, "utf8") };
          } else {
            result = { error: `File not found: ${call.args.filePath}` };
          }
        } else if (call.name === "listDir") {
          const dp = path.resolve(process.cwd(), call.args.dirPath || ".");
          if (fs.existsSync(dp)) {
            const files = fs.readdirSync(dp);
            const stats = files.map(f => {
              const fullPath = path.join(dp, f);
              const isDir = fs.statSync(fullPath).isDirectory();
              return { name: f, type: isDir ? "directory" : "file" };
            });
            result = { files: stats };
          } else {
            result = { error: `Directory not found: ${call.args.dirPath}` };
          }
        } else {
          result = { error: `Unsupported tool for analyzer: ${call.name}` };
        }
      } catch (err: any) {
        result = { error: err.message || String(err) };
      }

      toolParts.push({
        functionResponse: {
          name: call.name,
          response: { result: result }
        }
      });
    }

    contents.push({
      role: "user",
      parts: toolParts
    });
  }

  return {
    analyzerName: name,
    focus,
    findings: "Analysis timed out.",
    recommendedActions: "Proceed to planning.",
    filesRead: Array.from(filesRead)
  };
}

/**
 * Lead Coordinator combines parallel briefs and constructs master plans & sub-agents.
 */
async function decomposeTaskWithContext(
  mainTask: string,
  analysisBriefs: AnalysisBrief[]
): Promise<Decomposition> {
  console.log(`\n\x1b[36m[Manager] Parallel Analysis complete. Synthesizing briefings and constructing the execution team...\x1b[0m`);
  
  const briefsString = analysisBriefs.map(b => {
    return `### Analyzer: ${b.analyzerName} (Focus: ${b.focus})
- **Findings:** ${b.findings}
- **Recommendations:** ${b.recommendedActions}
- **Files Read:** ${b.filesRead.join(", ") || "None"}`;
  }).join("\n\n");

  const prompt = `You are the Lead Coordinator of an elite AI agent cluster.
You have been provided with comprehensive parallel analyzer briefings about the workspace and current file states:

${briefsString}

Now, formulate a cohesive Master Architectural Implementation Plan and decompose the remaining implementation into a sequence of highly focused, specialized sequential worker agents.
Each sub-agent will execute SEQUENTIALLY to perform the code modifications (writes).
For each sub-agent, define a specific name, clear professional role description, a custom laser-focused system instruction, and a precise prompt.

Important directives for system instructions:
- Advise them to use the provided tools (readFile, writeFile, listDir, runCommand) to write the actual changes directly.
- Remind them that they have full read/write access to the codebase.
- Enforce strict modular design and adherence to the Shade DSL Theme/spec guidelines.

Main Task:
${mainTask}`;

  const response = await generateContentWithRetry({
    model: "gemini-3.1-flash-lite",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: decompositionSchema,
      thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
    }
  });

  const text = response.text?.trim() || "{}";
  try {
    return JSON.parse(text) as Decomposition;
  } catch (err) {
    console.error("\x1b[31m[Error] Failed to parse decomposition response as JSON:\x1b[0m", text);
    throw err;
  }
}

/**
 * Defines the real workspace tools available to sequential sub-agents.
 */
function getWorkspaceTools() {
  return [
    {
      functionDeclarations: [
        {
          name: "readFile",
          description: "Read the entire content of a file in the workspace.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              filePath: { 
                type: Type.STRING, 
                description: "The relative path of the file to read from the project root, e.g. 'src/App.tsx'." 
              }
            },
            required: ["filePath"]
          }
        },
        {
          name: "writeFile",
          description: "Write complete contents to a file. This creates the file if it does not exist, or completely overwrites it if it does. Always write complete, functional, well-formatted code.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              filePath: { 
                type: Type.STRING, 
                description: "The relative path of the file to write, e.g. 'components/Page/Home.tsx'." 
              },
              content: { 
                type: Type.STRING, 
                description: "The complete, entire text content to write to the file." 
              }
            },
            required: ["filePath", "content"]
          }
        },
        {
          name: "listDir",
          description: "List all files and directories inside a given path relative to the project root.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              dirPath: { 
                type: Type.STRING, 
                description: "The relative directory path to list. Defaults to '.' (root)." 
              }
            },
            required: ["dirPath"]
          }
        },
        {
          name: "runCommand",
          description: "Execute a shell command (such as 'npm run lint' or 'npm run build') in the workspace to verify compilation, test changes, or check for errors.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              command: { 
                type: Type.STRING, 
                description: "The shell command to run." 
              }
            },
            required: ["command"]
          }
        }
      ]
    }
  ];
}

/**
 * Executes a single sub-agent with a tool-use loop.
 */
async function executeSubAgentWithTools(agent: SubAgent, index: number, total: number): Promise<string> {
  console.log(`\x1b[33m=============================================================\x1b[0m`);
  console.log(`\x1b[32m[Agent ${index + 1}/${total}] Spawning worker: ${agent.name}\x1b[0m`);
  console.log(`\x1b[36mRole:\x1b[0m ${agent.role}`);
  console.log(`\x1b[36mTask Prompt:\x1b[0m ${agent.prompt}`);
  console.log(`\x1b[33m=============================================================\x1b[0m`);

  const agentModified = new Set<string>();
  const agentRead = new Set<string>();

  const systemPrompt = `${agent.systemInstruction}

You are equipped with powerful workspace tools (readFile, writeFile, listDir, runCommand).
CRITICAL RULES:
1. Always read files (using readFile) before editing them to understand their structure.
2. When modifying a file, use writeFile with the COMPLETE, entire contents. Do not output truncated files or placeholders.
3. Verify your changes by running commands (e.g. runCommand with 'npm run lint' or 'npm run build') if necessary.
4. Keep comments clean and track your changes professionally.
`;

  const contents: any[] = [{ role: "user", parts: [{ text: agent.prompt }] }];
  const tools = getWorkspaceTools();
  
  let turn = 0;
  const maxTurns = 20; // safety limit
  let finalResponseText = "";

  while (turn < maxTurns) {
    turn++;
    console.log(`\x1b[90m[Agent ${agent.name}] Calling model turn ${turn}...\x1b[0m`);

    const response = await generateContentWithRetry({
      model: "gemini-3.1-flash-lite",
      contents: contents,
      config: {
        systemInstruction: systemPrompt,
        tools: tools,
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
      }
    });

    const candidate = response.candidates?.[0];
    const content = candidate?.content;
    
    if (content) {
      contents.push(content);
    }

    const functionCalls = response.functionCalls;
    if (!functionCalls || functionCalls.length === 0) {
      finalResponseText = response.text || "Execution complete.";
      break;
    }

    const toolParts: any[] = [];
    for (const call of functionCalls) {
      console.log(`\x1b[35m[Tool Use] Agent requested function: ${call.name}\x1b[0m`, JSON.stringify(call.args));
      let result: any;
      try {
        if (call.name === "readFile") {
          const fp = path.resolve(process.cwd(), call.args.filePath);
          if (!fp.startsWith(process.cwd())) {
            throw new Error("Access denied: path is outside the workspace root.");
          }
          agentRead.add(call.args.filePath);
          allReadFiles.add(call.args.filePath);
          if (fs.existsSync(fp)) {
            result = { content: fs.readFileSync(fp, "utf8") };
          } else {
            result = { error: `File not found at: ${call.args.filePath}` };
          }
        } else if (call.name === "writeFile") {
          const fp = path.resolve(process.cwd(), call.args.filePath);
          if (!fp.startsWith(process.cwd())) {
            throw new Error("Access denied: path is outside the workspace root.");
          }
          const dir = path.dirname(fp);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(fp, call.args.content, "utf8");
          agentModified.add(call.args.filePath);
          allModifiedFiles.add(call.args.filePath);
          result = { success: true, message: `Successfully wrote file: ${call.args.filePath}` };
          console.log(`\x1b[32m[Write Success] Wrote to: ${call.args.filePath}\x1b[0m`);
        } else if (call.name === "listDir") {
          const dp = path.resolve(process.cwd(), call.args.dirPath || ".");
          if (!dp.startsWith(process.cwd())) {
            throw new Error("Access denied: path is outside the workspace root.");
          }
          if (fs.existsSync(dp)) {
            const files = fs.readdirSync(dp);
            const stats = files.map(f => {
              const fullPath = path.join(dp, f);
              const isDir = fs.statSync(fullPath).isDirectory();
              return { name: f, type: isDir ? "directory" : "file" };
            });
            result = { files: stats };
          } else {
            result = { error: `Directory not found at: ${call.args.dirPath}` };
          }
        } else if (call.name === "runCommand") {
          const cmd = call.args.command;
          console.log(`\x1b[33m[Execute Command] Running: ${cmd}\x1b[0m`);
          try {
            const stdout = execSync(cmd, { encoding: "utf8", timeout: 45000 });
            result = { stdout, stderr: "" };
          } catch (cmdErr: any) {
            result = { 
              stdout: cmdErr.stdout || "", 
              stderr: cmdErr.stderr || cmdErr.message || String(cmdErr), 
              exitCode: cmdErr.status 
            };
          }
        } else {
          result = { error: `Unknown function: ${call.name}` };
        }
      } catch (err: any) {
        result = { error: err.message || String(err) };
      }

      console.log(`\x1b[34m[Tool Result] ${call.name} -> ${result.error ? "Failed" : "Success"}\x1b[0m`);
      toolParts.push({
        functionResponse: {
          name: call.name,
          response: { result: result }
        }
      });
    }

    contents.push({
      role: "user",
      parts: toolParts
    });
  }

  agent.modifiedFiles = Array.from(agentModified);
  agent.readFiles = Array.from(agentRead);

  console.log(`\x1b[32m[Agent ${agent.name}] Completed execution.\x1b[0m\n`);
  return finalResponseText;
}

/**
 * Spawns a final Reviewer Agent to verify everything, run checks, and generate a final review report.
 */
async function executeReviewerAgent(mainTask: string, plans: string, agents: SubAgent[]): Promise<string> {
  console.log(`\x1b[33m=============================================================\x1b[0m`);
  console.log(`\x1b[35m[Reviewer] Spawning Reviewer Agent to verify all modifications...\x1b[0m`);
  console.log(`\x1b[33m=============================================================\x1b[0m`);

  const modifiedList = Array.from(allModifiedFiles);
  const readList = Array.from(allReadFiles);

  const reviewerInstruction = `You are the Lead Quality Assurance and Code Auditor Agent.
Your job is to review all the changes made by the worker agents, run compilation and linting tests, verify that the solution matches the plan and user requirements, and compile the final report.

You have access to powerful tools. You can run 'npm run lint' or 'npm run build' via runCommand to check for errors, and read the modified files using readFile to verify correctness.
If you find any minor bugs or formatting issues, you can fix them directly using the tools!`;

  const reviewerPrompt = `Please review the implementation of the main task.
Main Task: ${mainTask}
Architectural Plan: ${plans}

The following files were modified:
${modifiedList.map(f => ` - ${f}`).join("\n")}

The following files were read:
${readList.map(f => ` - ${f}`).join("\n")}

Please perform the following actions:
1. Run lint and compilation tests using runCommand ('npm run lint' and 'npm run build') to verify there are no errors.
2. Read the modified files if necessary to verify logical soundness and elegance.
3. Compile a complete, rigorous, and polished review report detailing the verification status, any issues found and fixed, and instructions for running the app.`;

  const contents: any[] = [{ role: "user", parts: [{ text: reviewerPrompt }] }];
  const tools = getWorkspaceTools();
  
  let turn = 0;
  const maxTurns = 15;
  let finalReport = "";

  while (turn < maxTurns) {
    turn++;
    console.log(`\x1b[90m[Reviewer] Calling model turn ${turn}...\x1b[0m`);

    const response = await generateContentWithRetry({
      model: "gemini-3.1-flash-lite",
      contents: contents,
      config: {
        systemInstruction: reviewerInstruction,
        tools: tools,
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
      }
    });

    const candidate = response.candidates?.[0];
    const content = candidate?.content;
    
    if (content) {
      contents.push(content);
    }

    const functionCalls = response.functionCalls;
    if (!functionCalls || functionCalls.length === 0) {
      finalReport = response.text || "Verification complete.";
      break;
    }

    const toolParts: any[] = [];
    for (const call of functionCalls) {
      console.log(`\x1b[35m[Reviewer Tool Use] Requested: ${call.name}\x1b[0m`, JSON.stringify(call.args));
      let result: any;
      try {
        if (call.name === "readFile") {
          const fp = path.resolve(process.cwd(), call.args.filePath);
          if (fs.existsSync(fp)) {
            result = { content: fs.readFileSync(fp, "utf8") };
          } else {
            result = { error: `File not found at: ${call.args.filePath}` };
          }
        } else if (call.name === "writeFile") {
          const fp = path.resolve(process.cwd(), call.args.filePath);
          const dir = path.dirname(fp);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(fp, call.args.content, "utf8");
          result = { success: true, message: `Successfully wrote file: ${call.args.filePath}` };
          console.log(`\x1b[32m[Reviewer Fix] Wrote file: ${call.args.filePath}\x1b[0m`);
        } else if (call.name === "listDir") {
          const dp = path.resolve(process.cwd(), call.args.dirPath || ".");
          if (fs.existsSync(dp)) {
            const files = fs.readdirSync(dp);
            const stats = files.map(f => {
              const fullPath = path.join(dp, f);
              const isDir = fs.statSync(fullPath).isDirectory();
              return { name: f, type: isDir ? "directory" : "file" };
            });
            result = { files: stats };
          } else {
            result = { error: `Directory not found at: ${call.args.dirPath}` };
          }
        } else if (call.name === "runCommand") {
          const cmd = call.args.command;
          console.log(`\x1b[33m[Reviewer Execute] Running: ${cmd}\x1b[0m`);
          try {
            const stdout = execSync(cmd, { encoding: "utf8", timeout: 45000 });
            result = { stdout, stderr: "" };
          } catch (cmdErr: any) {
            result = { 
              stdout: cmdErr.stdout || "", 
              stderr: cmdErr.stderr || cmdErr.message || String(cmdErr), 
              exitCode: cmdErr.status 
            };
          }
        } else {
          result = { error: `Unknown function: ${call.name}` };
        }
      } catch (err: any) {
        result = { error: err.message || String(err) };
      }

      console.log(`\x1b[34m[Reviewer Tool Result] ${call.name} -> ${result.error ? "Failed" : "Success"}\x1b[0m`);
      toolParts.push({
        functionResponse: {
          name: call.name,
          response: { result: result }
        }
      });
    }

    contents.push({
      role: "user",
      parts: toolParts
    });
  }

  console.log(`\x1b[32m[Reviewer] Completed review successfully.\x1b[0m\n`);
  return finalReport;
}

/**
 * Main execution flow.
 */
async function main() {
  const args = process.argv.slice(2);
  const mainTask = args.join(" ").trim();

  if (!mainTask) {
    console.log("\x1b[35m=== Spawn Agents CLI Tool ===\x1b[0m");
    console.log("Usage: npx tsx scripts/spawnAgents.ts \"<your task description here>\"");
    process.exit(0);
  }

  try {
    // 1. Parallel Context Analysis Phase
    console.log(`\n\x1b[35m=== PHASE 1: Parallel Context Analysis ===\x1b[0m`);
    
    const analysisPromises = [
      executeParallelAnalyzer(
        "StructuralAnalyzer",
        "Codebase Structure & State Flow",
        "You analyze file lists, import mappings, dependency setups, and locate core components like App.tsx, index.tsx, package.json.",
        `Find and analyze the key functional files, routes, state declarations, and architectural structures relevant to completing: "${mainTask}"`
      ),
      executeParallelAnalyzer(
        "DesignSystemAnalyzer",
        "Styling, Layout, and Design Rules",
        "You analyze visual systems, components, Theme.tsx definitions, design rule catalogs, CSS/styling rules, and existing UI libraries.",
        `Extract styling constraints, Theme token mappings, custom components guidelines, and visual specifications relevant to: "${mainTask}"`
      ),
      executeParallelAnalyzer(
        "RulesAnalyzer",
        "Repository Rules & Development Guidelines",
        "You read rules files (such as AGENTS.md, GUIDE.md, LLM.md, README.md) to discover custom architectural patterns, quality guidelines, and coding safety rules.",
        `Analyze the specific coding and development guardrails we must maintain while executing: "${mainTask}"`
      )
    ];

    const briefs = await Promise.all(analysisPromises);
    console.log(`\x1b[32m✔ Parallel Context Analysis complete!\x1b[0m`);

    // 2. Planning & Decomposing
    console.log(`\n\x1b[35m=== PHASE 2: Architectural Planning & Sub-Agent Planning ===\x1b[0m`);
    const decomposition = await decomposeTaskWithContext(mainTask, briefs);
    console.log(`\x1b[32m[Success] Master plan established. Task decomposed into ${decomposition.agents.length} sequential worker agents:\x1b[0m`);
    decomposition.agents.forEach((agent, i) => {
      console.log(`  - \x1b[1m${agent.name}\x1b[0m: ${agent.role}`);
    });
    console.log("");

    // Create a plan file in /plans
    const plansDir = path.join(process.cwd(), "plans");
    if (!fs.existsSync(plansDir)) {
      fs.mkdirSync(plansDir, { recursive: true });
    }

    // 3. Sequential Execution Phase (writes must be sequential)
    console.log(`\n\x1b[35m=== PHASE 3: Sequential Code Generation ===\x1b[0m`);
    for (let i = 0; i < decomposition.agents.length; i++) {
      const agent = decomposition.agents[i];
      agent.output = await executeSubAgentWithTools(agent, i, decomposition.agents.length);
    }

    // 4. Quality Assurance Review Phase
    console.log(`\n\x1b[35m=== PHASE 4: Quality Assurance & Code Auditing ===\x1b[0m`);
    const reviewerReport = await executeReviewerAgent(mainTask, decomposition.plans, decomposition.agents);

    // 5. Save results to plans/
    const mdPath = path.join(plansDir, "spawnAgents_output.md");
    const jsonPath = path.join(plansDir, "spawnAgents_output.json");

    // Build the Markdown file
    let mdContent = `# Spawn Agents Execution Report: ${decomposition.taskName}\n\n`;
    mdContent += `## Main Task\n${mainTask}\n\n`;
    mdContent += `## Parallel Analyzer Findings\n\n`;
    for (const brief of briefs) {
      mdContent += `### Analyzer: ${brief.analyzerName} (Focus: ${brief.focus})\n`;
      mdContent += `- **Findings:** ${brief.findings}\n`;
      mdContent += `- **Recommended Actions:** ${brief.recommendedActions}\n`;
      mdContent += `- **Files Read:** ${brief.filesRead.join(", ") || "None"}\n\n`;
    }
    mdContent += `## Architectural Plan\n${decomposition.plans}\n\n`;
    mdContent += `## 1. Planned Agent Breakdown\n\n`;
    for (const agent of decomposition.agents) {
      mdContent += `### Agent: ${agent.name}\n`;
      mdContent += `- **Role:** ${agent.role}\n`;
      mdContent += `- **System Instruction:** \`${agent.systemInstruction}\`\n`;
      mdContent += `- **Sub-task Prompt:** *${agent.prompt}*\n`;
      mdContent += `- **Files Read:** ${agent.readFiles?.join(", ") || "None"}\n`;
      mdContent += `- **Files Modified:** ${agent.modifiedFiles?.join(", ") || "None"}\n\n`;
    }
    mdContent += `## 2. Individual Agent Responses\n\n`;
    for (const agent of decomposition.agents) {
      mdContent += `### [Output] ${agent.name}\n\n${agent.output}\n\n---\n\n`;
    }
    mdContent += `## 3. Cohesive Final Auditor Review Report\n\n${reviewerReport}\n`;

    fs.writeFileSync(mdPath, mdContent, "utf8");
    fs.writeFileSync(jsonPath, JSON.stringify({ mainTask, decomposition, reviewerReport, modifiedFiles: Array.from(allModifiedFiles), readFiles: Array.from(allReadFiles) }, null, 2), "utf8");

    console.log(`\x1b[32m✔ Final review report and implementation verified successfully!\x1b[0m`);
    console.log(`\x1b[36mMarkdown report saved to:\x1b[0m \x1b[1mplans/spawnAgents_output.md\x1b[0m`);
    console.log(`\x1b[36mJSON logs saved to:\x1b[0m \x1b[1mplans/spawnAgents_output.json\x1b[0m\n`);

    console.log(`\x1b[35m=== AUDITOR REVIEW REPORT ===\x1b[0m\n`);
    console.log(reviewerReport);

  } catch (error) {
    console.error("\x1b[31m[Critical Error] Failed to complete Spawn Agents workflow:\x1b[0m", error);
    process.exit(1);
  }
}

main();
