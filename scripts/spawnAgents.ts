import { GoogleGenAI, Type } from "@google/genai";
import * as fs from "fs";
import * as path from "path";

// Initialize Gemini client
// We must set the 'User-Agent' header to 'aistudio-build' in httpOptions for telemetry.
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
 * Robust wrapper to call Gemini API with automatic retries and exponential backoff
 * to elegantly handle transient errors (e.g. 503 Service Unavailable or model rate limits).
 */
async function generateContentWithRetry(params: any, retries: number = 5, delayMs: number = 3000): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      const errorStr = String(error?.message || error);
      const isTransient = errorStr.includes("503") || 
                          errorStr.includes("high demand") || 
                          errorStr.includes("temporary") ||
                          errorStr.includes("UNAVAILABLE") ||
                          error?.status === 503 ||
                          error?.code === 503;
      if (isTransient && attempt < retries) {
        console.warn(`\x1b[33m[Warning] Gemini API busy or unavailable. Retrying in ${delayMs}ms (Attempt ${attempt}/${retries})...\x1b[0m`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2; // exponential backoff
      } else {
        throw error;
      }
    }
  }
}

// Types for Sub-Agent configuration
interface SubAgent {
  name: string;
  role: string;
  systemInstruction: string;
  prompt: string;
  output?: string;
}

interface Decomposition {
  taskName: string;
  agents: SubAgent[];
}

// 1. Task Decomposition Schema
const subAgentSchema = {
  type: Type.OBJECT,
  properties: {
    name: { 
      type: Type.STRING, 
      description: "Name of the sub-agent, e.g. UXArchitect, CodeGenerator, SecurityAuditor" 
    },
    role: { 
      type: Type.STRING, 
      description: "Specific role, expertise, and focus area of this sub-agent" 
    },
    systemInstruction: { 
      type: Type.STRING, 
      description: "A tailored, laser-focused system instruction for this specific agent" 
    },
    prompt: { 
      type: Type.STRING, 
      description: "The specific sub-task or question this agent must execute or answer" 
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
    agents: {
      type: Type.ARRAY,
      items: subAgentSchema,
      description: "The team of specialized sub-agents required to decompose and solve the task"
    }
  },
  required: ["taskName", "agents"]
};

/**
 * Decomposes a main task into multiple specialized sub-tasks and sub-agent blueprints.
 */
async function decomposeTask(mainTask: string): Promise<Decomposition> {
  console.log(`\n\x1b[36m[Manager] Analyzing task and planning team composition...\x1b[0m`);
  console.log(`\x1b[90mTask: "${mainTask}"\x1b[0m\n`);

  const prompt = `Decompose the following task into a set of highly focused, specialized, and complementary sub-tasks.
Each sub-task will be executed by an isolated AI sub-agent.
For each sub-agent, define a specific name, clear professional role description, a custom laser-focused system instruction, and a precise prompt.
Ensure the sub-tasks collectively cover the entire scope of the main task.

Main Task:
${mainTask}`;

  const response = await generateContentWithRetry({
    model: "gemini-3.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: decompositionSchema,
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
 * Executes a single sub-agent with a completely fresh context and customized system instructions.
 */
async function executeSubAgent(agent: SubAgent, index: number, total: number): Promise<string> {
  console.log(`\x1b[33m-------------------------------------------------------------\x1b[0m`);
  console.log(`\x1b[32m[Agent ${index + 1}/${total}] Spawning sub-agent: ${agent.name}\x1b[0m`);
  console.log(`\x1b[36mRole:\x1b[0m ${agent.role}`);
  console.log(`\x1b[36mPrompt:\x1b[0m ${agent.prompt}`);
  console.log(`\x1b[90mSystem Instruction:\x1b[0m ${agent.systemInstruction.slice(0, 100)}...`);
  console.log(`\x1b[33m-------------------------------------------------------------\x1b[0m`);
  console.log(`\x1b[90mExecuting model call...\x1b[0m`);

  const response = await generateContentWithRetry({
    model: "gemini-3.5-flash",
    contents: agent.prompt,
    config: {
      systemInstruction: agent.systemInstruction,
    }
  });

  const output = response.text || "(No response output)";
  console.log(`\x1b[32m[Agent ${agent.name}] Completed execution successfully.\x1b[0m\n`);
  return output;
}

/**
 * Aggregates all sub-agent outputs into a coherent, comprehensive final manager report.
 */
async function aggregateOutputs(mainTask: string, decomposition: Decomposition): Promise<string> {
  console.log(`\x1b[36m[Manager] Collecting sub-agent outputs and compiling final response...\x1b[0m`);

  let subAgentReports = "";
  for (const agent of decomposition.agents) {
    subAgentReports += `### Agent: ${agent.name} (${agent.role})\n`;
    subAgentReports += `**Prompt:** ${agent.prompt}\n\n`;
    subAgentReports += `**Output:**\n${agent.output}\n\n`;
    subAgentReports += `---\n\n`;
  }

  const prompt = `You are the lead manager coordinating a team of specialized AI agents.
Your goal is to aggregate, synthesize, and compile their separate findings into a single, cohesive, authoritative, and structured final report that fully satisfies the main task.

Main Task:
${mainTask}

Individual Agent Sub-tasks and Results:
${subAgentReports}

Produce an elegant, comprehensive, markdown-formatted final aggregate report. Maintain deep professional detail from the individual agent answers. Avoid repetitive preambles.`;

  const response = await generateContentWithRetry({
    model: "gemini-3.5-flash",
    contents: prompt,
  });

  return response.text || "(No final output aggregated)";
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
    console.log("\nExample:\n  npx tsx scripts/spawnAgents.ts \"Design a subscription model and payment flow for a SaaS app including pricing tiers, security checks, and database schemas\"");
    process.exit(0);
  }

  try {
    // 1. Plan & Decompose
    const decomposition = await decomposeTask(mainTask);
    console.log(`\x1b[32m[Success] Task decomposed successfully into ${decomposition.agents.length} specialized sub-agents:\x1b[0m`);
    decomposition.agents.forEach((agent, i) => {
      console.log(`  - \x1b[1m${agent.name}\x1b[0m: ${agent.role}`);
    });
    console.log("");

    // 2. Execute each sub-agent
    for (let i = 0; i < decomposition.agents.length; i++) {
      const agent = decomposition.agents[i];
      agent.output = await executeSubAgent(agent, i, decomposition.agents.length);
    }

    // 3. Aggregate results
    const finalReport = await aggregateOutputs(mainTask, decomposition);

    // 4. Save results to plans/
    const plansDir = path.join(process.cwd(), "plans");
    if (!fs.existsSync(plansDir)) {
      fs.mkdirSync(plansDir, { recursive: true });
    }

    const mdPath = path.join(plansDir, "spawnAgents_output.md");
    const jsonPath = path.join(plansDir, "spawnAgents_output.json");

    // Build the Markdown file
    let mdContent = `# Spawn Agents Execution Report: ${decomposition.taskName}\n\n`;
    mdContent += `## Main Task\n${mainTask}\n\n`;
    mdContent += `## 1. Planned Agent Breakdown\n\n`;
    for (const agent of decomposition.agents) {
      mdContent += `### Agent: ${agent.name}\n`;
      mdContent += `- **Role:** ${agent.role}\n`;
      mdContent += `- **System Instruction:** \`${agent.systemInstruction}\`\n`;
      mdContent += `- **Sub-task Prompt:** *${agent.prompt}*\n\n`;
    }
    mdContent += `## 2. Individual Agent Responses\n\n`;
    for (const agent of decomposition.agents) {
      mdContent += `### [Output] ${agent.name}\n\n${agent.output}\n\n---\n\n`;
    }
    mdContent += `## 3. Cohesive Final Aggregated Solution\n\n${finalReport}\n`;

    fs.writeFileSync(mdPath, mdContent, "utf8");
    fs.writeFileSync(jsonPath, JSON.stringify({ mainTask, decomposition, finalReport }, null, 2), "utf8");

    console.log(`\x1b[32m✔ Final aggregated solution generated successfully!\x1b[0m`);
    console.log(`\x1b[36mMarkdown report saved to:\x1b[0m \x1b[1mplans/spawnAgents_output.md\x1b[0m`);
    console.log(`\x1b[36mJSON logs saved to:\x1b[0m \x1b[1mplans/spawnAgents_output.json\x1b[0m\n`);

    console.log(`\x1b[35m=== COHESIVE FINAL AGGREGATED REPORT ===\x1b[0m\n`);
    console.log(finalReport);

  } catch (error) {
    console.error("\x1b[31m[Critical Error] Failed to complete Spawn Agents workflow:\x1b[0m", error);
    process.exit(1);
  }
}

main();
