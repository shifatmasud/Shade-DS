# Tech Spec - SpawnAgents Project-Scoped Artifact Sandboxing & Full Codebase Read Access

1. **Objective**
   - **Problem Statement**: Spawned sub-agents and orchestrator processes in `scripts/spawnAgents.ts` must be strictly restricted to writing only within their assigned project sandbox directory `artifacts/{project-id}/` (including subdirectories such as `plans/`, `research/`, `strategy/`, `analysis/`, `implementation/`, `outputs/`, `tests/`, `reviews/`, `state/`, `agents-messenger/`, and `chatRoom.md`). At the same time, agents must retain full, unrestricted read access across the entire workspace codebase (`/`, `/components`, `/framer`, `/skills`, `/hooks`, etc.) to perform deep codebase research and analysis.
   - **Solution Overview**: 
     1. Upgrade `ToolExecutionEngine` in `scripts/spawnAgents.ts` to accept `projectId` and `allowedWriteDir` (`process.cwd()/artifacts/${projectId}`).
     2. Enforce strict write sandboxing in `writeFile` tool: all target write paths must resolve within `artifacts/${projectId}/`. Any attempt to write outside the project artifact sandbox is rejected with a clear permission error.
     3. Support both explicit paths (e.g. `artifacts/${projectId}/implementation/MyComponent.tsx`) and relative subpaths (e.g. `implementation/MyComponent.tsx` automatically sandboxed inside `artifacts/${projectId}/implementation/MyComponent.tsx`).
     4. Maintain full workspace read permissions for `readFile` and `listDir` across the entire codebase directory tree starting from `process.cwd()`.
     5. Update `AgentsMessengerEngine` so that when a `projectId` is active, all agent messenger streams, thread files, and ledgers are written strictly to `artifacts/${projectId}/agents-messenger/`.
     6. Update agent system prompts, role registry guidelines, and task instructions to explicitly inform agents of the `artifacts/{projectId}/` write constraint and full codebase read capability.
   - **Scope**: `scripts/spawnAgents.ts`, `/skills/spawn-agents/SKILL.md`.

2. **Success Criteria**
   - **Key Results**:
     - `ToolExecutionEngine.executeTool('writeFile', ...)` restricts file writes exclusively to `artifacts/{project-id}/`.
     - Attempts to write files outside `artifacts/{project-id}/` are safely blocked with an informative `Permission Denied` result.
     - `readFile` and `listDir` can read any file in the workspace directory tree.
     - `AgentsMessengerEngine` writes to `artifacts/{project-id}/agents-messenger/` for project runs.
     - All artifacts, state files, plans, and chat logs are safely stored in `artifacts/{project-id}/`.
     - Codebase builds cleanly with `npm run build` and lints with `npm run lint`.
   - **Non-Negotiables**:
     - No writes outside `artifacts/{project-id}/` by sub-agent tool calls.
     - Read permissions for the full codebase must not be broken or restricted.
     - Strict adherence to AGENTS.md and system rules.

3. **Project Requirements**
   - [x] Create technical specification in `/plans/`.
   - [x] Update `ToolExecutionEngine` to enforce `artifacts/${projectId}` write sandbox while allowing full codebase reads.
   - [x] Update `spawnFreshAgent` and `ManagerOrchestrator` to pass project-scoped sandbox configuration to all worker agents.
   - [x] Update `AgentsMessengerEngine` to scope file creations to `artifacts/${projectId}/agents-messenger/`.
   - [x] Update role definitions and prompt instructions to document the sandbox boundary.
   - [x] Update `/skills/spawn-agents/SKILL.md` to reflect the sandboxing architecture.
   - [x] Verify compilation and linting.

4. **Architecture Decisions**
   - **Decision 1**: Sandboxed path resolution logic:
     If the agent provides a path starting with `artifacts/${projectId}/`, resolve against `process.cwd()`.
     If the agent provides a relative path like `implementation/foo.ts` or `analysis/bar.md`, resolve against `path.join(process.cwd(), "artifacts", projectId, relativePath)`.
     If the agent provides an absolute path or relative path targeting outside `artifacts/${projectId}/` (e.g. `components/Core/Button.tsx` or `../../etc`), check `normalizedPath.startsWith(allowedWriteDir)`. If not, return `{ error: "Permission Denied: Spawned agents are restricted to write only within artifacts/{projectId}/." }`.
   - **Decision 2**: Unrestricted read access:
     `readFile` and `listDir` resolve relative to `process.cwd()` ensuring agents can inspect any component, hook, skill, shader, or configuration across the full codebase.
   - **Decision 3**: Backward compatibility:
     When running CLI subcommands like `messenger list` without a project ID, default to `agents-messenger/` or list existing artifact directories safely.

5. **Pseudo Code (Shade DSL)**
   ```dsl
   MODULE SpawnAgentsSandbox {
     DATA {
       projectId: String
       workspaceRoot: Path = process.cwd()
       sandboxRoot: Path = workspaceRoot / "artifacts" / projectId
     }
     
     LOGIC {
       FUNCTION resolveReadPath(inputPath: String) -> Path {
         RESOLVE normalized = workspaceRoot / inputPath
         ASSERT normalized.startsWith(workspaceRoot)
         RETURN normalized
       }
       
       FUNCTION resolveWritePath(inputPath: String) -> Path {
         IF inputPath.startsWith("artifacts/" + projectId) THEN
           RESOLVE target = workspaceRoot / inputPath
         ELSE IF inputPath.startsWith("artifacts/") THEN
           REJECT "Target is outside active project artifact sandbox"
         ELSE
           RESOLVE target = sandboxRoot / inputPath
         END IF
         
         ASSERT target.startsWith(sandboxRoot)
         RETURN target
       }
     }
     
     RENDER {
       TOOL_ENGINE(readScope = FULL_WORKSPACE, writeScope = SANDBOX_ONLY)
     }
   }
   ```
