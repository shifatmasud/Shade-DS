# OKR - Spawn Agents CLI Tool

## Objective 1: Implement a reliable multi-agent orchestration CLI tool
- **KR 1.1**: Successfully parse CLI inputs and initialize the Google GenAI SDK.
- **KR 1.2**: Achieve 100% success rate in structuring task decompositions into JSON with fields: `name`, `role`, `systemInstruction`, and `prompt`.
- **KR 1.3**: Execute sub-agents with completely isolated context windows (using individual API calls) and successfully gather their individual outputs.

## Objective 2: Provide clean visual outputs and durable persistence
- **KR 2.1**: Render a beautifully formatted, terminal-colored console log of the management flow (Manager planning -> Sub-agent prompts/roles -> Sub-agent outputs -> Aggregation).
- **KR 2.2**: Write out complete markdown and JSON result files in `/plans/` after every execution.
