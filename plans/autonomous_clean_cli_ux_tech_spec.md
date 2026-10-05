# Tech Spec: Autonomous Zero-Touch CLI UX & Executive Orchestration Pipeline

1. **Objective**
   - **Problem Statement**: The existing CLI outputs raw logs and requires awareness of subcommands for various stages. Users want a clean, elegant, and fully autonomous "zero-handholding" experience: provide a single task prompt, and the Manager orchestrator takes full ownership—decomposing, analyzing, implementing, reviewing, verifying, and fixing until production-ready without interrupting the user.
   - **Solution Overview**: Overhaul the terminal UX in `scripts/spawnAgents.ts` into a clean, modern, executive dashboard. Implement an autonomous step-by-step pipeline indicator (`[1/5] Planning`, `[2/5] Parallel Discovery`, `[3/5] Implementation`, `[4/5] Authoritative Review`, `[5/5] Autonomous Fix Loop`) with formatted badges, file modification counts, clean diff summaries, and a final executive completion card. Retain granular details in `/artifacts/{project-id}/chatRoom.md` and `/agents-messenger/` while keeping terminal output pristine, readable, and noise-free.
   - **Scope & Context**:
     - Modern terminal UI helpers: Box borders (`┌─┐`, `└─┘`), stage indicators (`● [STAGE]`), elapsed time, clean spinners, and badge formatters.
     - Single-command zero-touch execution: `npx tsx scripts/spawnAgents.ts "<task>"` executes full autonomous loop.
     - Auto-healing fix loop: Manager detects reviewer failures, auto-spawns fixer agents, applies remedies, re-verifies builds until PASS with zero user intervention.
     - Compact executive summary output displaying modified files, test/build status, and link to `chatRoom.md`.

2. **Success Criteria**
   - **Key Results**:
     1. Running `npx tsx scripts/spawnAgents.ts "<task>"` executes all 5 stages autonomously with zero prompts or human handholding.
     2. Clean, aesthetically pleasing terminal UI with styled stage headers, progress indicators, and an executive completion card.
     3. Raw API token dumps and verbose internals suppressed in normal mode (available via `--verbose`).
     4. Build and lint passes 100% verified before completion.
   - **Non-Negotiables**:
     - No manual prompts or blocking questions in autonomous mode.
     - Complete fidelity of `chatRoom.md` and `/agents-messenger/` preserved.

3. **Project Requirements**
   - [x] Create Tech Spec in `/plans/autonomous_clean_cli_ux_tech_spec.md`.
   - [x] Implement `CLITheme` styling and box-drawing formatters in `scripts/spawnAgents.ts`.
   - [x] Streamline `ManagerOrchestrator` execution logs into elegant stage steps with elapsed timers.
   - [x] Implement autonomous zero-touch fallback & retry loops for worker tasks and reviewer fixes.
   - [x] Create executive summary completion banner with key metrics (tasks completed, files modified, build/lint status).
   - [x] Comprehensively update `/skills/spawn-agents/SKILL.md` with H1-delimited contexts covering `chatRoom.md`, `/agents-messenger` 1:1 streams, and zero-touch autonomous CLI UX.
   - [x] Test and verify with `compile_applet` and sample autonomous run.

4. **Architecture Decisions**
   - **Trade-offs**:
     - *Clean Executive Dashboard vs Verbose Output*: Default to clean, modern terminal dashboard so users get instant clarity on progress without noise. Full conversational transcripts remain accessible in `artifacts/{project-id}/chatRoom.md` and `agents-messenger/`.
   - **Benefits**:
     - Fast cognitive comprehension.
     - True autonomous "fire-and-forget" developer experience.

5. **Pseudo Code (Written in Shade DSL)**
   ```dsl
   DATA:
     StageStatus: "PENDING" | "RUNNING" | "SUCCESS" | "WARNING" | "FAILED"
     Stage: {
       number: number,
       title: string,
       status: StageStatus,
       details?: string
     }

   LOGIC:
     RenderHeader(objective, projectId):
       print BoxedHeader("AGENT MANAGER: AUTONOMOUS WORKSPACE RUNNER")
       print MetadataRow("Project", projectId, "Objective", objective)

     ExecuteAutonomousPipeline(taskPrompt):
       RenderHeader(taskPrompt)
       
       Stage 1: Plan & Strategy
       MasterPlan = AutonomousPlan(taskPrompt)
       RenderStageSuccess("[1/5] Master Architectural Plan formulated")
       
       Stage 2: Parallel Codebase & Token Discovery
       Analysis = AutonomousAnalyze()
       RenderStageSuccess("[2/5] Structural intelligence & design tokens analyzed")
       
       Stage 3: Task Graph & Worker Execution
       Workers = AutonomousBuild(MasterPlan, Analysis)
       RenderStageSuccess(`[3/5] Executed ${Workers.length} worker tasks`)
       
       Stage 4: Authoritative Review & Verification
       Review = AutonomousReview()
       
       Stage 5: Autonomous Fix Loop (if needed)
       while Review.status == "FAIL":
         RenderStageWarning("[5/5] Review issues detected. Triggering autonomous fixer...")
         FixCodebase(Review.issues)
         Review = AutonomousReview()
       
       RenderStageSuccess("[5/5] Verification passed (100% build & lint clean)")
       RenderExecutiveCard(MasterPlan, Workers, Review)

   RENDER:
     TerminalUX:
       Render colored ASCII cards, badges, and clean tabular summaries.
   ```
