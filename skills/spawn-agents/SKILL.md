---
name: spawn-agents
description: The advanced multi-agent orchestrator system to handle complex tasks by decomposing them into highly focused sequential worker agents (using gemini-3.5-flash-lite by default) following a strict Plan -> Build -> Review workflow. Triggers on `/spawnAgents`.
---

# Spawn Agents Orchestration Skill

This skill governs the execution of the multi-agent execution pipeline implemented in `/scripts/spawnAgents.ts`. It ensures any agent operating in this repository is fully aligned with the **Plan → Build → Review** multi-agent cycle.

---

## 1. Core Architectural Constraints & Configuration

- **Trigger Command**: This skill triggers on `/spawnAgents`.
- **Default Model**: All spawned sub-agents (analyzers, lead coordinator, worker agents, reviewer) use `gemini-3.5-flash-lite` by default (configurable via `SUB_AGENT_MODEL` environment variable).
- **Strict Plan-First Workflow**:
  1. **Planning**: Create a tech spec / plan document in the `/plans` directory first.
  2. **Plan Reading & Decomposition**: Spawned sub-agents read the designated master plan from the path provided via `--plan` (or `-p`) and decompose the work into discrete tasks (**1 task per agent**).
  3. **Sequential Code Generation**: Workers execute code modifications (`writeFile`) sequentially to avoid race conditions and preserve file integrity.
  4. **Review & Audit**: A dedicated Reviewer Agent runs compilation and linting checks (`npm run lint`, `npm run build`) and audits all code changes.
  5. **Summary**: The main agent synthesizes the results, summarizes the auditor findings, and responds to the user.

- **Tool Access**: Sub-agents operate with fresh context windows and interact with the workspace via:
  - `readFile(filePath)`
  - `writeFile(filePath, content)`
  - `listDir(dirPath)`
  - `runCommand(command)`

---

## 2. CLI Command & Usage

To execute the multi-agent orchestrator, you **MUST** pass the path to the master plan file using the `--plan` (or `-p`) flag so that sub-agents can read and decompose the tasks:

```bash
npx tsx scripts/spawnAgents.ts "<task description>" --plan <path_to_plan_spec>
```

### Example:
```bash
npx tsx scripts/spawnAgents.ts "Add database sync engine" --plan plans/db_sync_spec.md
```

### Generated Artifacts & Reports in `/artifacts/`
All sub-agent generated reports, plans, logs, and other artifacts must live strictly in the `/artifacts/` directory:
- **Spec Plan**: Generated sub-agent plan saved to `/artifacts/<task_name>_spec.md`.
- **Markdown Report**: Saved to `/artifacts/spawnAgents_output.md` containing analyzer briefs, agent breakdown, individual responses, and Auditor Review Report.
- **JSON Logs**: Saved to `/artifacts/spawnAgents_output.json` tracking read files, modified files, and structured logs.

---

## 3. Best Practices

1. **Plan First**: Always provide a clear, well-structured master plan via the `--plan` flag.
2. **One Task Per Agent**: Keep each spawned worker focused on exactly one module or sub-task.
3. **Verify Build**: Always let the QA Auditor run lint and build checks to ensure zero regressions.
