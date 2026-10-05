# Tech Spec: Manager-Centric Multi-Agent CLI & SpawnAgents Architecture

1. **Objective**
   - **Problem Statement**: The current `spawnAgents.ts` script runs a rigid linear pipeline where agents don't have fine-grained isolated contexts, project-level durable state recovery, dynamic role allocation, least-privilege tool granting, or a complete communication ledger in `chatGroup.yaml`.
   - **Solution Overview**: Transform `spawnAgents.ts` into a complete Manager-Centric Multi-Agent CLI orchestration runtime in Node.js + TypeScript powered by `@google/genai` using `gemini-flash-latest`. The Manager serves as the sole default coordinator with a strict star topology, allocating fresh, context-isolated sub-agents for specialized roles (Strategist, Planner, Builder, Researcher, Analyst, Tester, Reviewer), persisting all prompts and responses in `/artifacts/{project-id}/chatGroup.yaml`, and managing state under `/artifacts/{project-id}/state/`.
   - **Scope & Context**: 
     - Complete CLI supporting human and AI execution with subcommands (`run`, `project list|create|status`, `task list`, `artifacts`, `chat`, `resume`, `manager`) and machine-readable `--json` output.
     - Backward compatibility: direct `npx tsx scripts/spawnAgents.ts "<task>" [--plan <path>]` maps directly to execution.
     - Strict context isolation: fresh Gemini context per worker call, zero cross-contamination.
     - Granular tool permissions: `filesystem_read`, `filesystem_write`, `terminal` granted per task.
     - Full YAML ledger and durable state recovery.

2. **Success Criteria**
   - **Key Results**:
     1. Full CLI command matrix operational (`run`, `project`, `task`, `artifacts`, `chat`, `resume`, `manager`).
     2. Every CLI-generated prompt & response atomically recorded in `/artifacts/{project-id}/chatGroup.yaml`.
     3. Strict star topology where workers never directly talk to each other without explicit Manager-created collaboration groups.
     4. Fresh context isolation for every sub-agent turn with scoped artifact and tool access.
     5. Persistent state in `/artifacts/{project-id}/state/` enabling clean recovery via `resume`.
     6. Parallel execution support for independent research/strategy/analysis tasks.
     7. Authoritative Reviewer & Fix Agent loop ensuring 100% build & lint pass rates.
     8. Backwards compatibility with existing skill references (`/artifacts/spawnAgents_output.md`, `spawnAgents_output.json`, and `<task_slug>_spec.md`).
   - **Non-Negotiables**:
     - Uses modern `@google/genai` with `gemini-flash-latest`.
     - Zero unhandled exceptions or crashes.
     - `npm run lint` and `npm run build` pass with zero errors.

3. **Project Requirements**
   - [x] Create comprehensive Tech Spec plan in `/plans/manager_centric_multi_agent_cli_tech_spec.md`.
   - [ ] Implement YAML serializer and parser utilities for robust block-literal formatting.
   - [ ] Implement ChatGroup Ledger engine for recording all prompts, tool calls, and responses.
   - [ ] Implement Project State Manager (`project.yaml`, `tasks.yaml`, `decisions.yaml`, `permissions.yaml`).
   - [ ] Implement Tool Permissions and Scoped Execution engine (`readFile`, `writeFile`, `listDir`, `runCommand`).
   - [ ] Implement Role Registry (Strategist, Planner, Builder, Researcher, Analyst, Tester, Reviewer) with extensible system instructions.
   - [ ] Implement Manager Orchestrator with dynamic task decomposition, parallel execution, synthesis, and recovery.
   - [ ] Implement Reviewer & Fix Loop engine.
   - [ ] Implement CLI command parser supporting all subcommands and flags (`--json`, `--plan`, `--project`, `--limit`).
   - [ ] Verify execution with `compile_applet` and test CLI invocation.

4. **Architecture Decisions**
   - **Trade-offs**: 
     - *Custom YAML handler vs external package*: Building a zero-dependency, robust YAML formatter/parser ensures instant zero-install reliability and exact block literal formatting (`|`) without package bloat or version collisions.
     - *Star Topology vs Agent Swarm*: Star topology with Manager as context broker ensures high predictability, eliminates infinite loops, enforces least privilege, and preserves auditability.
   - **Benefits**:
     - Fully inspectable execution trace through `chatGroup.yaml`.
     - Durable recovery from disk state after process interruptions.
     - Clean separation of concerns between Planner, Builder, Tester, and Reviewer.

5. **Pseudo Code (Written in Shade DSL)**
   ```dsl
   DATA:
     ProjectState: {
       id: string,
       name: string,
       objective: string,
       status: "active" | "completed" | "failed",
       createdAt: string,
       updatedAt: string,
       tasks: TaskDefinition[],
       decisions: DecisionRecord[],
       collaborationGroups: CollaborationGroup[]
     }
     ChatMessage: {
       id: string,
       timestamp: string,
       sender: { type: "human" | "manager" | "agent", id: string, role?: string },
       recipient: { type: "human" | "manager" | "agent", id: string, role?: string },
       channel: string,
       type: "user_prompt" | "agent_prompt" | "agent_response" | "decision" | "tool_call" | "tool_response" | "retry" | "review",
       content: string,
       context?: { artifacts?: string[], tools?: string[] },
       artifacts?: string[],
       task?: string
     }

   LOGIC:
     ManagerLoop(userRequest, options):
       projectId = options.projectId || generateSlug(userRequest)
       projectDir = initArtifactDirectories(projectId)
       ledger = new ChatGroupLedger(projectDir)
       ledger.logHumanPrompt(userRequest)

       state = loadOrCreateProjectState(projectId, userRequest)
       managerContext = constructManagerContext(state)

       // Determine task complexity & plan
       strategy = ManagerDecideStrategy(userRequest)
       
       if strategy.isComplex:
         // Spawn parallel strategists/researchers with fresh contexts
         parallelResults = Parallel([
           SpawnFreshAgent("strategist", taskA, tools: ["filesystem_read"]),
           SpawnFreshAgent("researcher", taskB, tools: ["filesystem_read"])
         ])
         synthesis = ManagerSynthesize(parallelResults)
         masterPlan = SpawnFreshAgent("planner", synthesis, tools: ["filesystem_read"])
       else:
         masterPlan = SpawnFreshAgent("planner", userRequest, tools: ["filesystem_read"])

       tasks = ManagerPartitionTasks(masterPlan)
       
       // Execute tasks in topological order
       for task in TopologicalSort(tasks):
         scopedTools = ResolveToolsForRole(task.role)
         scopedArtifacts = ResolveArtifactsForTask(task)
         output = SpawnFreshAgent(task.role, task, tools: scopedTools, artifacts: scopedArtifacts)
         ManagerRecordOutput(output)

       // Authoritative Reviewer
       review = SpawnFreshAgent("reviewer", masterPlan, tools: ["filesystem_read", "terminal"])
       while review.status == "FAIL" && retries < MAX_RETRIES:
         fix = SpawnFreshAgent("builder", review.issues, tools: ["filesystem_read", "filesystem_write", "terminal"])
         review = SpawnFreshAgent("reviewer", masterPlan, tools: ["filesystem_read", "terminal"])

       ledger.logDecision("Project execution completed successfully.")
       return ManagerSummarize(projectState)

   RENDER:
     CLIOutput:
       Display structured step-by-step progress, colorized status badges, and artifact links.
       If --json flag provided, output machine-readable JSON payload.
   ```
