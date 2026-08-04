---
name: spawn-agents
description: Advanced multi-agent orchestrator system featuring separated Planner, Lead Coordinator, Task Dependency Graph, Worker Contracts, Authoritative Reviewer, and Rejection Feedback Loop. Triggers on `/spawnAgents`.
---

# Spawn Agents Orchestration Skill

This skill governs the execution of the upgraded multi-agent execution pipeline implemented in `/scripts/spawnAgents.ts`. It ensures any agent operating in this repository follows a dependency-aware, feedback-driven orchestration process:

```
User Request
      │
      ▼
Planner Agent (Architectural Spec & Explicit Acceptance Criteria)
      │
      ▼
Lead Coordinator Agent (Partitions Approved Plan into Task Dependency Graph)
      │
      ▼
Parallel Analysis Agents (Read-Only Concurrent Briefings: Structural, Design System, Rules)
      │
      ▼
Dependency-Ordered Worker Agents (Worker Contracts: Input → Execution → Output)
      │
      ▼
Authoritative Reviewer Agent (Build/Lint + Architecture, Naming, Duplication, Security)
      │
      ├── PASS ──► Summary & Artifacts (/artifacts/)
      │
      └── FAIL ──► Fix Agent Loop ──► Re-Reviewer Audit (up to MAX_RETRIES)
```

---

## 1. Core Pipeline Roles & Responsibilities

1. **Planner Agent**:
   - Formulates or validates the Master Architectural Plan without executing code edits.
   - Defines explicit **Acceptance Criteria** and **Non-Negotiable Quality Guardrails** (successful build, clean lint, Theme.tsx token compliance, no type errors).

2. **Lead Coordinator Agent**:
   - Takes the approved Master Plan and partitions it into a **Task Dependency Graph**.
   - Assigns unique task IDs, explicit dependencies (e.g. `task_2` depends on `task_1`), target files, constraints, and acceptance criteria.
   - Does NOT invent unapproved work.

3. **Parallel Context Analysis Agents**:
   - Concurrently executes read-only analysis agents (`StructuralAnalyzer`, `DesignSystemAnalyzer`, `RulesAnalyzer`) via `Promise.all` to inspect codebase state without write race conditions.

4. **Dependency-Ordered Worker Agents**:
   - Executed in topological dependency order.
   - Operates under strict **Worker Contracts**:
     - **Input Contract**: Task details, plan section, constraints, target files, and predecessor outputs (rationales, modified files, assumptions from completed dependent tasks).
     - **Output Contract**: Structured result containing `modifiedFiles`, `readFiles`, `rationale`, `assumptions`, `risks`, and execution status (`COMPLETED`, `PARTIAL`, `FAILED`).

5. **Authoritative Reviewer Agent**:
   - Runs `npm run lint` and `npm run build` using `runCommand`.
   - Inspects modified files for:
     - Architectural & structural compliance
     - Code duplication & anti-patterns
     - Naming consistency & Theme.tsx design token usage
     - Security, API safety, and edge cases
     - Full compliance with Master Plan Acceptance Criteria
   - Returns an authoritative `PASS` or `FAIL` status with structured `issues`.

6. **Fix Agent Loop**:
   - When the Reviewer returns `FAIL`, the **Fix Agent** is spawned with failing issue descriptions, compiler logs, and instructions.
   - Systematically resolves compiler errors, broken imports, or missing tokens, then submits back to the Reviewer for re-audit (up to `MAX_REVIEW_RETRIES`).

---

## 2. CLI Command & Usage

To execute the multi-agent orchestrator:

```bash
npx tsx scripts/spawnAgents.ts "<task description>" [--plan <path_to_plan_spec>]
```

### Examples:

- **Without pre-written plan** (Planner Agent formulates spec automatically):
```bash
npx tsx scripts/spawnAgents.ts "Add real-time state synchronization engine"
```

- **With pre-written plan** (Planner Agent validates and attaches criteria):
```bash
npx tsx scripts/spawnAgents.ts "Implement 3D Shader Stage Controls" --plan plans/shader_controls_spec.md
```

---

## 3. Generated Artifacts & Reports in `/artifacts/`

All execution reports, plans, logs, and artifacts are persisted in `/artifacts/`:
- **Tech Spec**: `/artifacts/<task_slug>_spec.md` containing objective, architecture decisions, acceptance criteria, and task graph.
- **Markdown Report**: `/artifacts/spawnAgents_output.md` containing analyzer briefings, worker contracts, fix loop history, and final auditor report.
- **Structured JSON Logs**: `/artifacts/spawnAgents_output.json` tracking read/modified files, worker contracts, and review results.

---

## 4. Best Practices for Sub-Agents

1. **Adhere to Approved Spec**: Workers must strictly implement the task defined in their contract without scope creep.
2. **Context Pass-Forward**: Downstream workers must review predecessor outputs to maintain consistent abstractions and avoid duplicate logic.
3. **Theme.tsx Token Usage**: Always use JS style objects and `Surface`/`Content` tokens from `Theme.tsx` rather than manual borders or Tailwind CSS.
4. **Zero Compiler Regressions**: Reviewer and Fix Agent ensure 100% build and lint pass rates before final completion.
