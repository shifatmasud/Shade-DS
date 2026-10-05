# Tech Spec - Rename Artifacts to Projects for Spawn Agents

1. **Objective**
Rename the primary storage directory for the `spawnAgents.ts` orchestrator from `/artifacts` to `/projects`. This aligns better with the semantic meaning of "Project-scoped" isolation and durably recorded agent workflows.

2. **Success Criteria**
- All outputs from `spawnAgents.ts` (logs, messenger streams, project state, task outputs) are saved in `/projects/{project-id}/`.
- `AGENTS.md` and `SKILL.md` (spawn-agents) are updated to reflect the new directory name.
- The CLI command help and output messages use "projects" instead of "artifacts".
- Existing `/artifacts` directory is migrated or handled (user request implies a permanent switch).

3. **Project Requirements**
- Update `scripts/spawnAgents.ts` constants and path logic.
- Update `AGENTS.md` documentation.
- Update `skills/spawn-agents/SKILL.md` documentation.
- Update `metadata.json` if needed (not likely but will check).
- Migrate existing `/artifacts` directory to `/projects`.

4. **Architecture Decisions**
- Perform a global search and replace for `artifacts/` (when it refers to the storage dir) and `artifacts` (when it refers to the directory name) within `scripts/spawnAgents.ts`.
- Ensure tool sandboxing logic is updated to `projects/`.
- Maintain backward compatibility if possible, or perform a one-time move of the directory.

5. **Pseudo Code**
```typescript
// scripts/spawnAgents.ts
const BASE_STORAGE_DIR = "projects";

class ProjectArtifactsManager {
  constructor(public projectId: string) {
    this.baseDir = path.join(process.cwd(), BASE_STORAGE_DIR);
    // ...
  }
}

// Update system instructions for agents:
// "Sandboxed Write Access: All file writing using 'writeFile' is strictly sandboxed inside 'projects/${opts.projectManager.projectId}/'."
```
