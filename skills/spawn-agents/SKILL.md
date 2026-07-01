---
name: spawn-agents
description: The advanced multi-agent orchestrator system to handle complex tasks by decomposing them into highly focused sequential worker agents (parallel read, sequential write) followed by a comprehensive Quality Assurance / Auditor review.
---

# Spawn Agents Orchestration Skill

This skill governs the execution of the multi-agent execution pipeline implemented in `/scripts/spawnAgents.ts`. It ensures any agent operating in this repository is fully aligned with the **Plan → Build → Review** cycle.

---

## 1. Core Architectural Constraints

To prevent race conditions, avoid file-system corruption, and ensure pristine structural integrity, the orchestrator enforces these constraints:

- **Strict Decomposition**: Any complex task is first broken down into a team of specialized sub-agents, each given a single, highly focused role and prompt (e.g., UXArchitect, CodeGenerator, StyleManager, BugFixer).
- **Parallel Reads, Sequential Writes**: Workers can query and read file contexts in parallel to understand the environment, but any file modifications, edits, or writes MUST be executed sequentially (one agent at a time).
- **Tool Access Isolation**: Every worker agent gets a fresh, clean context window but has full access to the project via standard workspace tools:
  - `readFile(filePath)`
  - `writeFile(filePath, content)`
  - `listDir(dirPath)`
  - `runCommand(command)`
- **Mandatory Quality Assurance Review**: After all worker agents complete their sequence, a final **QA/Auditor Agent** is spawned to verify the build, run tests (`npm run lint` and `npm run build`), inspect modified code for elegance, fix any remaining minor bugs, and write a comprehensive validation report.

---

## 2. CLI Command & Usage

To invoke the multi-agent orchestrator, run the following command in the workspace shell:

```bash
npx tsx scripts/spawnAgents.ts "<your task description here>"
```

### Automatic Output Mapping
The script logs progress live to the console with beautiful, formatted ANSI colors and writes detailed reports when execution is complete:
- **Markdown Report**: Saved to `/plans/spawnAgents_output.md` containing the overall task description, planning details, worker agent lists, separate agent outputs, and the final Auditor Review Report.
- **JSON Logs**: Saved to `/plans/spawnAgents_output.json` for programmatic tracking of read files, modified files, and individual outputs.

---

## 3. Best Practices for Prompts

When presenting a task to the orchestrator:
1. **Be Specific**: State the target files, design requirements, and desired user interactions.
2. **Align with Shade DSL**: Remind the system of styling rules (JS style objects over Tailwind where specified, typography pairing, border procedural helpers, and Framer Motion layouts).
3. **Double-check Plans**: Ensure the system generates custom plans first under `/plans` before starting code generation.
