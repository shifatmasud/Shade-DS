# ADR - Spawn Agents CLI Architecture

## Context
The user wants a tool/workflow where any high-level task is managed by a multi-agent team.
Instead of a single agent doing all the work in one context, we decompose the work into specialized sub-tasks, each handled by a dedicated, specialized model call with a fresh context. This reduces context noise, improves specialized accuracy, and follows a structured multi-agent workflow.

## Decision
1. **Model Selection**: Use `gemini-3.5-flash` as the core model for both the Manager and the specialized Sub-Agents. This model is exceptionally fast, supports structured outputs, and has advanced reasoning capabilities.
2. **Language & Environment**: Implement the tool in TypeScript inside the `/scripts/` folder (`/scripts/spawnAgents.ts`). Leverage `tsx` (which is already configured in `package.json` dev scripts) for execution.
3. **Structured Decomposition**: Use the `@google/genai` SDK's `responseSchema` to guarantee the model outputs a valid list of sub-agents with specific properties (role, system instruction, specific sub-task prompt).
4. **Output Logging & Archiving**: Write the outputs to standard locations (`plans/spawnAgents_output.md` and `plans/spawnAgents_output.json`) so the host process or user can inspect the results instantly.
