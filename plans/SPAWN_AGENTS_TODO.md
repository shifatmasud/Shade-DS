# TODO - Spawn Agents CLI Implementation

- [ ] Create `/scripts/spawnAgents.ts` and set up the imports, types, and Gemini SDK initialization.
- [ ] Define the response schema for task decomposition.
- [ ] Implement the `decomposeTask` function to turn a main task prompt into a structured list of sub-agent configurations.
- [ ] Implement the `executeSubAgent` function to run each specialized agent with its own system instruction and prompt.
- [ ] Implement the `aggregateOutputs` function to combine sub-agent results into a final cohesive markdown response.
- [ ] Add nice CLI styling/colors and file saving logic (writing to `plans/spawnAgents_output.md` and `plans/spawnAgents_output.json`).
- [ ] Test compiling/linting the script to verify type-safety.
- [ ] Add a script shortcut in `package.json` (e.g. `"spawn-agents": "tsx scripts/spawnAgents.ts"`) if appropriate, or keep it run-ready.
- [ ] Update `AGENTS.md` to establish the new system instruction regarding multi-agent orchestration.
