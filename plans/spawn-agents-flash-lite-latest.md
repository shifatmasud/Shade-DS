# Tech Spec 

1. **Objective**
- **Problem Statement**:
  The multi-agent orchestration script (`/scripts/spawnAgents.ts`) currently defaults to `"gemini-3.5-flash-lite"` when `process.env.SUB_AGENT_MODEL` is not specified. The project requirements require updating the default model to use `"gemini-flash-lite-latest"` so that sub-agents (Planner, Context Analyzers, Lead Coordinator, Worker Agents, Authoritative Reviewer, and Fix Agent) automatically route to the latest Gemini Flash-Lite model by default without requiring an explicit environment override.
- **Solution Overview**:
  Update the fallback definition of `DEFAULT_MODEL` in `/scripts/spawnAgents.ts` from `"gemini-3.5-flash-lite"` to `"gemini-flash-lite-latest"`, while preserving the ability to override it via `process.env.SUB_AGENT_MODEL`.
- **Scope**:
  - `/scripts/spawnAgents.ts`: Update `DEFAULT_MODEL` assignment.
- **Context**:
  Runs in Node.js / `tsx` environment for multi-agent code orchestration and automated tech-spec generation.

---

2. **Success Criteria**
- **Key Results**:
  - `DEFAULT_MODEL` in `/scripts/spawnAgents.ts` defaults to `"gemini-flash-lite-latest"` when `process.env.SUB_AGENT_MODEL` is undefined or empty.
  - Existing `process.env.SUB_AGENT_MODEL` override behavior remains intact.
  - All sub-agents (Planner, Analyzers, Coordinator, Workers, Reviewer, Fix Agent) inherit the updated default model.
  - Zero compilation regressions or lint errors.
- **Non-Negotiables & Criteria**:
  - Dock immunity preserved (`/components/Section/Dock.tsx` untouched).
  - No new icon libraries or unnecessary dependencies installed.
  - Code changes strictly scoped to the requested modification.

---

3. **Project Requirements**
- [x] Create technical planning specification in `/plans/spawn-agents-flash-lite-latest.md`.
- [x] Update `DEFAULT_MODEL` definition in `/scripts/spawnAgents.ts` to fallback to `"gemini-flash-lite-latest"`.
- [x] Verify TypeScript compilation and lint checks pass cleanly.
- [x] Review changes and provide a concise summary.

---

4. **Architecture Decisions**
- **Model Identifier Selection**:
  - *Decision*: Use the standard alias `"gemini-flash-lite-latest"`.
  - *Trade-off*: An alias points dynamically to the latest generation of Flash-Lite rather than a pinned minor version string.
  - *Benefit*: Complies directly with user instruction ("use gemini flash lite latest by default"), providing the lowest latency, highest throughput, and newest features for multi-agent workflows.
- **Preservation of `process.env.SUB_AGENT_MODEL`**:
  - *Decision*: Keep `process.env.SUB_AGENT_MODEL || "gemini-flash-lite-latest"`.
  - *Benefit*: Allows operators to test specific model versions or pins if necessary, while providing the requested default out of the box.

---

5. **Pseudo Code** (Written in Shade DSL)
```dsl
Module SpawnAgentsOrchestrator:
  Data:
    subAgentModelEnv: String = process.env.SUB_AGENT_MODEL
    defaultModel: String = subAgentModelEnv || "gemini-flash-lite-latest"
    maxReviewRetries: Number = 3
    aiClient: GoogleGenAI = new GoogleGenAI(apiKey)

  Logic:
    initializeOrchestrator():
      verifyApiKey()
      log("Using model:", defaultModel)

    executeSubAgent(role, prompt, schema):
      response = generateContentWithRetry({
        model: defaultModel,
        contents: prompt,
        config: schema
      })
      return response

  Render:
    Null
```
