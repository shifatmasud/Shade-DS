# PRD - Spawn Agents CLI Tool

## Goal
Build a CLI tool (`spawnAgents`) that decomposes a high-level user request into multiple specialized sub-tasks, assigns each sub-task to an isolated sub-agent with its own fresh context window and dedicated system instructions, and manages the aggregation of their outputs to deliver a cohesive, multi-agent solution.

## Requirements
- **CLI Interface**: Accept a prompt/task as a CLI string argument (e.g., `npx tsx scripts/spawnAgents.ts "build a widget"`).
- **Gemini API Integration**: Use `@google/genai` with `gemini-3.5-flash` for fast, cost-effective processing.
- **Task Decomposition**: Use Gemini with structured JSON output (`responseMimeType: "application/json"`) to automatically break down the task into $N$ specialized, independent, or sequentially chained sub-tasks.
- **Fresh Context Sub-Agents**: Dynamically spawn a new Gemini model request (with an empty history/fresh context and specialized system instructions) for each sub-task.
- **Aggregation**: A "Manager Agent" collects the output of all sub-agents and produces a unified final report/plan.
- **Output Artifacts**: Save execution logs and results to both `plans/spawnAgents_output.md` and `plans/spawnAgents_output.json` for persistent storage and developer review.
