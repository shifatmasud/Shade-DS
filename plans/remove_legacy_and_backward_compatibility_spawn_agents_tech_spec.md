# Tech Spec - Remove Legacy & Backward Compatibility Code from SpawnAgents & SKILL.md

1. **Objective**
   - **Problem Statement**: `scripts/spawnAgents.ts` and `/skills/spawn-agents/SKILL.md` contain legacy compatibility code, including `ChatGroupLedger` alias, legacy YAML chat ledger parsing (`chatGroup.yaml`), root-level `/agents-messenger/` duality, root-level artifact output duplication (`saveCompatibilityArtifacts`), and legacy fallback paths.
   - **Solution Overview**:
     1. Remove `ChatGroupLedger` alias and `parseLegacyYaml` from `scripts/spawnAgents.ts`.
     2. Streamline `ChatRoomLedger` to strictly read and write markdown ledger files (`chatRoom.md`).
     3. Refactor `AgentsMessengerEngine` to exclusively manage project-scoped messenger streams under `artifacts/{project-id}/agents-messenger/`.
     4. Refactor `saveCompatibilityArtifacts` in `ManagerOrchestrator` to `saveProjectReports`, exclusively writing self-contained reports to `artifacts/{project-id}/`.
     5. Update `/skills/spawn-agents/SKILL.md` to remove all mentions of legacy yaml, fallback aliases, and root messenger duality.
   - **Scope**: `scripts/spawnAgents.ts`, `/skills/spawn-agents/SKILL.md`.

2. **Success Criteria**
   - **Key Results**:
     - Zero legacy aliases (`ChatGroupLedger`) or legacy parser methods (`parseLegacyYaml`) in codebase.
     - All agent messages, chatrooms, specs, reports, and worker outputs are exclusively stored in `artifacts/{project-id}/`.
     - Clean compilation (`npm run build`) and linting (`npm run lint`).
     - Updated documentation in `/skills/spawn-agents/SKILL.md`.
   - **Non-Negotiables**:
     - No breakage of core 5-stage orchestration pipeline.
     - Strict adherence to `Theme.tsx` and system rules.

3. **Project Requirements**
   - [x] Create plan in `/plans/`.
   - [x] Remove legacy YAML parser and `ChatGroupLedger` alias from `scripts/spawnAgents.ts`.
   - [x] Streamline `AgentsMessengerEngine` to strictly use `artifacts/{project-id}/agents-messenger/`.
   - [x] Rename and update `saveCompatibilityArtifacts` to `saveProjectReports` targeting `artifacts/{project-id}/`.
   - [x] Update `/skills/spawn-agents/SKILL.md` documentation.
   - [x] Verify compilation and linting.

4. **Architecture Decisions**
   - **Decision 1**: Eliminate root-level `agents-messenger/` completely in favor of pure project-scoped `artifacts/{project-id}/agents-messenger/`.
   - **Decision 2**: Remove `parseLegacyYaml` and legacy `chatGroup.yaml` checks; `chatRoom.md` is the sole source of truth for communication ledger.
   - **Decision 3**: Store all generated reports and specs solely inside `artifacts/{project-id}/`.

5. **Pseudo Code (Shade DSL)**
   ```dsl
   MODULE CleanSpawnAgentsRuntime {
     DATA {
       projectId: String
       projectDir: Path = "artifacts" / projectId
       chatRoomPath: Path = projectDir / "chatRoom.md"
       messengerDir: Path = projectDir / "agents-messenger"
     }
     
     LOGIC {
       FUNCTION getMessages() -> List<ChatMessage> {
         IF NOT EXISTS(chatRoomPath) RETURN []
         RETURN parseMarkdownChatRoom(chatRoomPath)
       }
       
       FUNCTION saveProjectReports(plan, analysis, outputs, review) {
         WRITE projectDir / "task_spec.md"
         WRITE projectDir / "spawnAgents_output.md"
         WRITE projectDir / "spawnAgents_output.json"
       }
     }
     
     RENDER {
       ORCHESTRATOR(cleanLedger = TRUE, legacyCompatibility = FALSE)
     }
   }
   ```
