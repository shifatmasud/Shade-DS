---
name: spawn-agents
description: Manager-Centric Multi-Agent CLI orchestration system in Node.js + TypeScript powered by Gemini Flash. Features zero-touch autonomous execution, clean executive CLI UX, strict star topology, context-isolated sub-agents, least-privilege tool granting, durable state recovery, a complete global communication ledger in chatRoom.md, and 1:1 direct agent streams in /agents-messenger. Triggers on `/spawnAgents`.
---

# Spawn Agents: Autonomous Manager-Centric Multi-Agent Orchestration Skill

This skill governs the execution of the Manager-Centric Multi-Agent CLI runtime implemented in `/scripts/spawnAgents.ts`. It establishes the **Manager** as the autonomous central coordinator: a user or parent agent provides a single task prompt, and the Manager autonomously handles planning, parallel discovery, task graph partitioning, worker execution, authoritative review, and self-healing fixes with zero handholding.

```
                         HUMAN / AI
                             │
               npx tsx scripts/spawnAgents.ts "<task>"
                             │
                             ▼
                       ┌───────────┐
                       │  MANAGER  │  ◄─── Sole Persistent Coordinator
                       │   Flash   │       Logs to chatRoom.md & /agents-messenger/
                       └─────┬─────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
      STRATEGIST          PLANNER           RESEARCHER
    (fresh context)   (fresh context)    (fresh context)
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                          MANAGER
                             │
             ┌───────────────┼───────────────┐
             ▼               ▼               ▼
          ANALYST         BUILDER         REVIEWER ──► FIXER (Auto-Heal Loop)
      (fresh context) (fresh context) (fresh context)     (fresh context)
```

---

# Core Architectural Invariants

1. **Rule 1 — Zero-Touch Autonomous Manager Execution**:
   - The user only needs to invoke the CLI once with a task prompt (`npx tsx scripts/spawnAgents.ts "<task>"`).
   - The Manager autonomously executes all 5 lifecycle stages (Planning → Parallel Discovery → Task Graph Execution → Authoritative Review → Self-Healing Fix Loop) without requiring manual intervention or handholding.
2. **Rule 2 — Manager is the Sole Coordinator (Star Topology)**:
   - Every interaction flows through the Manager (`Human ↔ Manager ↔ Sub-agent`).
   - Workers never directly communicate with each other unless routed through the Manager or via explicit 1:1 dispatches in `/agents-messenger`.
3. **Rule 3 — Fresh Context for Every Sub-Agent**:
   - Every sub-agent call spawns a brand-new, isolated Gemini context (`gemini-3.8-flash` with automatic multi-model retry/fallback).
   - Never leaks the Manager's or other workers' conversation history.
   - Passes only the explicit role, task instructions, selected artifacts, and least-privilege granted tools.
4. **Rule 4 — Complete Global Communication Ledger (`chatRoom.md`)**:
   - Replaces legacy `chatGroup.yaml`. Every CLI-generated prompt, tool call, tool response, and agent response is formatted and appended chronologically to `/artifacts/{project-id}/chatRoom.md`.
   - Includes a backward-compatible `ChatGroupLedger` alias and legacy YAML parser fallback.
5. **Rule 5 — Dedicated 1:1 Agent Messenger Streams (`artifacts/{project-id}/agents-messenger/{agent-name}.md`)**:
   - Every agent active in a project has its own dedicated 1:1 communication stream persisted at:
     ```
     artifacts/{project-id}/agents-messenger/{agent-name}.md
     ```
   - For universal inspection across projects, threads are also maintained at `/agents-messenger/{agent-name}.md`.
   - Every built-in agent (`manager`, `strategist`, `planner`, `builder`, `researcher`, `analyst`, `tester`, `reviewer`, `fixer`, `human`) and any dynamically spawned custom worker (`planner_01`, `researcher_structural`, `analyst_design_system`, `builder_component_x`, etc.) gets its own `.md` ledger.
   - All inbound prompts, tool executions, and outbound responses involving that agent are appended in chronological Markdown blocks.
6. **Rule 6 — Project-Scoped Write Sandboxing & Full Codebase Read Access**:
   - **Full Codebase Read Access**: Sub-agents have unrestricted read access across the entire repository codebase via `readFile` and `listDir` (e.g., `Theme.tsx`, `components/`, `framer/`, `skills/`, `hooks/`, configs).
   - **Strict Artifact Write Sandboxing**: All file modifications and creations via `writeFile` are strictly sandboxed inside `artifacts/{project-id}/`. Attempts to write outside the project artifact sandbox are rejected with a permission error.
   - Sub-agents only receive explicit tools (`filesystem_read`, `filesystem_write`, `terminal`) required for their role.
   - Terminal tool calls (`runCommand`) execute with piped stdio (`stdio: ["pipe", "pipe", "pipe"]`) so compiler/linter output is captured cleanly for the agent and ledger without polluting the user's terminal UX.

---

# Clean Executive Terminal UX (`CLITheme`)

When running an autonomous task, `CLITheme` renders a high-signal, noise-free terminal interface:

1. **Executive Header Banner**: Displays the box-drawn orchestrator banner and active task objective.
2. **5-Stage Live Progress Pipeline**:
   - `[1/5] Formulating Master Architectural Plan` (`● IN PROGRESS` → `✔ COMPLETE`)
   - `[2/5] Parallel Discovery (Structural, Design System, Rules)` (`● IN PROGRESS` → `✔ COMPLETE`)
   - `[3/5] Executing N Autonomous Worker Task(s)` (`● IN PROGRESS` → `✔ COMPLETE`)
   - `[4/5] Running Authoritative Review (Lint & Build Audit)` (`● IN PROGRESS` → `✔ COMPLETE` / `▲ AUTO-HEALING`)
   - `[5/5] Zero-Defect Verification / Self-Healing Auto-Fixer` (`✔ COMPLETE` / `▲ AUTO-HEALING` / `✖ FAILED`)
3. **Tree-Structured Sub-Details**: Uses `├─` and `└─` connectors to show concise plan targets, acceptance criteria counts, worker file modifications, and lint/build results.
4. **Executive Completion Card**: Prints a final boxed summary table with Project ID, Objective, Build Status, Lint Status, Quality Audit Score, Modified Files, `chatRoom.md` path, and `agents-messenger/` location.

---

# CLI Command Matrix

The CLI supports both human-friendly executive output and machine-readable `--json` output:

```bash
# 1. Zero-Touch Autonomous Execution (Recommended Shorthand)
npx tsx scripts/spawnAgents.ts "<task description>" [--plan <path>] [--project <id>] [--json]

# Explicit run subcommand (equivalent to shorthand):
npx tsx scripts/spawnAgents.ts run "<task description>" [--plan <path>] [--project <id>] [--json]

# 2. Direct 1:1 Agent Messenger (/agents-messenger)
npx tsx scripts/spawnAgents.ts messenger list [--json]
npx tsx scripts/spawnAgents.ts messenger read <agent-name> [--json]
npx tsx scripts/spawnAgents.ts messenger send <from-agent> <to-agent> "<message>" [--project <id>] [--json]

# 3. Global Communication Ledger Inspection (chatRoom.md)
npx tsx scripts/spawnAgents.ts chat <project-id> [--json]

# 4. Project Management & State Inspection
npx tsx scripts/spawnAgents.ts project list [--json]
npx tsx scripts/spawnAgents.ts project create <project-id> [--json]
npx tsx scripts/spawnAgents.ts project status <project-id> [--json]

# 5. Task & Artifact Inspection
npx tsx scripts/spawnAgents.ts task list <project-id> [--json]
npx tsx scripts/spawnAgents.ts artifacts <project-id> [--json]

# 6. Resume Interrupted Project
npx tsx scripts/spawnAgents.ts resume <project-id> [--json]
```

---

# Communication Ledgers: `chatRoom.md` & `/agents-messenger`

## 1. Global Project Ledger (`/artifacts/{project-id}/chatRoom.md`)
Managed by `ChatRoomLedger`, every message across the entire project is recorded in structured Markdown:

```markdown
# ChatRoom: {project-id}
- **Project**: `{project-id}`
- **Version**: 1
- **Created**: "2026-10-05T00:00:00.000Z"
- **Ledger**: Manager-Centric Multi-Agent Execution Stream

---

## [msg_001] 2026-10-05T00:00:01.000Z | manager → planner_01 (AGENT_PROMPT)
- **Channel**: `manager`
- **Sender**: `manager` (manager)
- **Recipient**: `agent` (planner_01, role: planner)
- **Type**: `agent_prompt`
- **Task**: `planner_01`
- **Tools**: `filesystem_read`

### Content:
...
```

## 2. 1:1 Direct Agent Streams (`artifacts/{project-id}/agents-messenger/{agent-name}.md`)
Managed by `AgentsMessengerEngine`, every agent from `manager` to custom worker instances has a dedicated `.md` file recording all 1:1 interactions where that agent is the sender, recipient, or role target:
- **Project-Scoped Directory**: `artifacts/{project-id}/agents-messenger/{agent-name}.md`
- **Global Root Directory**: `/agents-messenger/{agent-name}.md`
- **File Format**:
  ```markdown
  # Agent Messenger: {agent-name}
  - **Agent Name**: `{agent-name}`
  - **Role**: `{agent-role}`
  - **Title**: {Agent Title}
  - **Channel**: 1:1 Direct Agent Stream
  - **Created**: "2026-10-05T00:00:00.000Z"

  ---

  ## [msg_001] 2026-10-05T00:00:01.000Z | manager → builder (AGENT_PROMPT)
  - **Channel**: `1:1`
  - **Sender**: `manager` (manager)
  - **Recipient**: `agent` (builder, role: builder)
  - **Type**: `agent_prompt`
  - **Task**: `build_feature`
  - **Granted Tools**: `filesystem_read`, `filesystem_write`, `terminal`

  ### Content:
  ...

  ---

  ## [msg_002] 2026-10-05T00:00:05.000Z | builder → manager (AGENT_RESPONSE)
  - **Channel**: `1:1`
  - **Sender**: `agent` (builder, role: builder)
  - **Recipient**: `manager` (manager)
  - **Type**: `agent_response`
  - **Task**: `build_feature`

  ### Content:
  ...
  ```
- **Direct 1:1 Dispatch**:
  ```bash
  npx tsx scripts/spawnAgents.ts messenger send human builder "Hello builder, confirm your task." --project <project-id>
  ```
  Spawns an isolated `builder` context on channel `1:1`, writes the exchange to `artifacts/{project-id}/agents-messenger/builder.md`, `artifacts/{project-id}/agents-messenger/human.md`, `artifacts/{project-id}/agents-messenger/manager.md`, and `artifacts/{project-id}/chatRoom.md`, and displays the response in the CLI.

---

# Persistent Artifact Directory Structure

Every project maintains durable state, 1:1 messenger threads, and structured outputs under `/agents-messenger/` and `/artifacts/{project-id}/`:

```
/
├── agents-messenger/                  # Root-level 1:1 agent messenger markdown files
│   ├── manager.md
│   ├── strategist.md
│   ├── planner.md
│   ├── builder.md
│   ├── researcher.md
│   ├── analyst.md
│   ├── tester.md
│   ├── reviewer.md
│   ├── fixer.md
│   ├── human.md
│   └── <custom-agent-id>.md           # Auto-created for custom/task-specific agents
└── artifacts/
    ├── spawnAgents_output.md          # Latest execution report summary
    ├── spawnAgents_output.json        # Latest machine-readable execution payload
    └── {project-id}/
        ├── agents-messenger/          # Project-scoped 1:1 agent messenger threads
        ├── research/                  # Research findings & discovery briefs
        ├── strategy/                  # Architectural strategy documents
        ├── plans/                     # Master plans (master_plan.yaml)
        ├── analysis/                  # Parallel analysis briefs (initial_brief.md)
        ├── implementation/            # Code generation artifacts
        ├── tests/                     # Validation & test execution logs
        ├── reviews/                   # Authoritative reviewer audit reports
        ├── decisions/                 # Architectural decision records
        ├── outputs/                   # Worker output contracts (<task_id>_output.yaml)
        ├── state/                     # Durable project state (project.yaml)
        └── chatRoom.md                # Complete chronological communication ledger
```

---

# Built-in Roles & Tool Access

| Role | Default Tools | Responsibility |
| :--- | :--- | :--- |
| `strategist` | `filesystem_read` | High-level architectural trade-offs and direction |
| `planner` | `filesystem_read` | Formulates master plan, task dependency graph, and acceptance criteria |
| `researcher` | `filesystem_read` | Inspects workspace code, directory structure, and component hierarchy |
| `analyst` | `filesystem_read` | Audits `Theme.tsx` tokens, Shade DSL rules, and file immunities (`Dock.tsx`, `README.md`) |
| `builder` | `filesystem_read`, `filesystem_write`, `terminal` | Implementation engineer writing complete, non-truncated code using Theme tokens |
| `tester` | `filesystem_read`, `terminal` | Verification, compilation, and runtime testing |
| `reviewer` | `filesystem_read`, `filesystem_write`, `terminal` | Authoritative code auditor running `npm run lint` and `npm run build` |
| `fixer` | `filesystem_read`, `filesystem_write`, `terminal` | Self-healing remediation engineer resolving reviewer-reported compiler/lint issues |

---

# Authoritative Reviewer & Self-Healing Fix Agent Loop

During Stage 4 (`[4/5]`), the Manager spawns `reviewer_lead` to run `npm run lint` and `npm run build` and audit all modified files against `Theme.tsx` tokens and acceptance criteria.

When the Reviewer returns `status: "FAIL"`, the Manager automatically enters Stage 5 (`[5/5] Self-Healing Auto-Fixer`):
1. Spawns a fresh `fixer` agent (`fixer_retry_1`, etc.) with the exact failing compiler/linter logs and file-level fix instructions.
2. The `fixer` inspects the failing files, applies complete fixes via `writeFile`, and verifies via `runCommand`.
3. The Manager re-runs the Authoritative Reviewer until `status: "PASS"` or `MAX_REVIEW_RETRIES` (3) is reached.
4. Updates durable state in `project.yaml` and renders the final Executive Completion Card.
