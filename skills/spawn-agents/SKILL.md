---
name: spawn-agents
description: Manager-Centric Multi-Agent CLI orchestration system in Node.js + TypeScript powered by Gemini flash. Features strict star topology, context-isolated sub-agents, least-privilege tool granting, durable state recovery, and complete communication ledger in chatRoom.md. Triggers on `/spawnAgents`.
---

# Spawn Agents: Manager-Centric Multi-Agent Orchestration Skill

This skill governs the execution of the Manager-Centric Multi-Agent CLI runtime implemented in `/scripts/spawnAgents.ts`. It establishes the Manager as the sole central coordinator, isolates all sub-agent contexts, and maintains a complete, append-friendly communication ledger in `chatRoom.md`.

```
                         HUMAN / AI
                             │
                             ▼
                       ┌───────────┐
                       │  MANAGER  │
                       │   Flash   │
                       └─────┬─────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
      STRATEGIST           BUILDER          RESEARCHER
    (fresh context)    (fresh context)   (fresh context)
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                          MANAGER
                             │
             ┌───────────────┼───────────────┐
             ▼               ▼               ▼
          ANALYST          TESTER          REVIEWER
      (fresh context)  (fresh context)  (fresh context)
```

---

## 1. Core Architectural Invariants

1. **Rule 1 — Manager is the Sole Coordinator**:
   - Every interaction flows through the Manager (`Human ↔ Manager ↔ Sub-agent`).
   - Workers never directly communicate unless the Manager explicitly creates a project/task-scoped collaboration group.
2. **Rule 2 — Fresh Context for Every Sub-Agent**:
   - Every sub-agent call creates a fresh, isolated Gemini context with `gemini-flash-latest`.
   - Never leaks the Manager's or other workers' conversation history.
   - Passes only explicit role, task, relevant project info, selected artifacts, and granted tools.
3. **Rule 3 — Manager is Persistent Coordinator**:
   - Maintains orchestration state on disk (`/artifacts/{project-id}/state/project.yaml`).
   - Automatically recovers and resumes interrupted projects.
4. **Rule 4 — Complete Communication Ledger (`chatRoom.md`)**:
   - Every CLI-generated prompt, tool call, tool response, and agent response is recorded in `/artifacts/{project-id}/chatRoom.md`.
   - The ledger acts as the complete, auditable communication history for the project.
5. **Rule 5 — Least-Privilege Tool & Artifact Permissions**:
   - Sub-agents only receive explicit tools (`filesystem_read`, `filesystem_write`, `terminal`) necessary for their task.

---

## 2. CLI Command Matrix

The CLI is terminal-native and runnable by both humans and AI agents. Supports structured text output and `--json` machine-readable output:

```bash
# 1. Run a task (starts manager orchestration loop)
npx tsx scripts/spawnAgents.ts run "<task description>" [--plan <path>] [--project <id>] [--json]

# Direct shorthand invocation (equivalent to run):
npx tsx scripts/spawnAgents.ts "<task description>" [--plan <path>]

# 2. Project management
npx tsx scripts/spawnAgents.ts project list [--json]
npx tsx scripts/spawnAgents.ts project create <id> [--json]
npx tsx scripts/spawnAgents.ts project status <id> [--json]

# 3. Task inspection
npx tsx scripts/spawnAgents.ts task list <id> [--json]

# 4. Artifacts inspection
npx tsx scripts/spawnAgents.ts artifacts <id> [--json]

# 5. Communication ledger inspection
npx tsx scripts/spawnAgents.ts chat <id> [--json]

# 6. Resume interrupted project
npx tsx scripts/spawnAgents.ts resume <id> [--json]
```

---

## 3. Persistent Artifact Directory Structure

Every project manages durable state and outputs under `/artifacts/{project-id}/`:

```
/artifacts/
└── {project-id}/
    ├── research/          # Research findings & discovery briefs
    ├── strategy/          # Architectural strategy documents
    ├── plans/             # Master plans & acceptance criteria
    ├── analysis/          # Parallel analysis briefs
    ├── implementation/    # Code generation artifacts
    ├── tests/             # Validation & test execution logs
    ├── reviews/           # Authoritative reviewer audit reports
    ├── decisions/         # Architectural decision records
    ├── outputs/           # Worker output contracts
    ├── state/             # Durable project state (project.yaml)
    └── chatRoom.md        # Complete communication ledger
```

---

## 4. Built-in Roles & Tool Access

| Role | Default Tools | Description |
| :--- | :--- | :--- |
| `strategist` | `filesystem_read` | High-level architectural trade-offs and direction |
| `planner` | `filesystem_read` | Formulates master plan, task graph, and acceptance criteria |
| `researcher` | `filesystem_read` | Inspects workspace code, patterns, and existing structures |
| `analyst` | `filesystem_read` | Structural analysis, impact assessment, and risk auditing |
| `builder` | `filesystem_read`, `filesystem_write`, `terminal` | Implementation engineer writing complete, clean code |
| `tester` | `filesystem_read`, `terminal` | Verification, compilation, and runtime tests |
| `reviewer` | `filesystem_read`, `filesystem_write`, `terminal` | Authoritative code auditor running lint/build and verifying criteria |
| `fixer` | `filesystem_read`, `filesystem_write`, `terminal` | Targeted remediation engineer for reviewer-reported issues |

---

## 5. Authoritative Reviewer & Fix Agent Loop

When the Reviewer returns `status: "FAIL"`, the Manager triggers the **Fix Agent Loop**:
1. Spawns a fresh `fixer` agent with failing compiler logs and issue descriptions.
2. Applies targeted fixes to the codebase.
3. Re-runs the Authoritative Reviewer until `PASS` or `MAX_REVIEW_RETRIES` is reached.
4. Ensures 100% build pass and clean lint validation.
