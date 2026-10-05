# Tech Spec: ChatRoom Markdown Communication Ledger

1. **Objective**
   - **Problem Statement**: The previous communication ledger format used `chatGroup.yaml`. While YAML is structured, Markdown (`chatRoom.md`) provides superior visual readability in text editors, GitHub preview, terminal renderers, and web inspectors, making live agent exchanges, tool calls, and review decisions immediately legible without syntax friction.
   - **Solution Overview**: Transition the multi-agent communication logging engine in `scripts/spawnAgents.ts` from `chatGroup.yaml` to `chatRoom.md`. Every CLI-generated prompt, agent response, tool call, and tool execution result is appended as a formatted Markdown section with structured metadata headers, timestamps, role badges, code blocks, and context attributes.
   - **Scope & Context**: 
     - Update `ChatGroupLedger` class to `ChatRoomLedger` pointing to `/artifacts/{project-id}/chatRoom.md`.
     - Implement human-friendly and parseable Markdown entry formatter.
     - Preserve message schema (ID, timestamp, sender, recipient, channel, type, context, artifacts, task).
     - Maintain backward compatibility when parsing existing legacy `chatGroup.yaml` or new `chatRoom.md` via `npx tsx scripts/spawnAgents.ts chat <id>`.
     - Update `/skills/spawn-agents/SKILL.md` to reflect `chatRoom.md`.

2. **Success Criteria**
   - **Key Results**:
     1. New executions generate `/artifacts/{project-id}/chatRoom.md` instead of `chatGroup.yaml`.
     2. Every interaction (human prompts, manager prompts, agent responses, tool invocations, tool outputs) is appended to `chatRoom.md`.
     3. The `agent chat <project-id>` CLI command reads and renders messages cleanly in terminal and with `--json`.
     4. Build and lint passes cleanly with zero compiler regressions.
   - **Non-Negotiables**:
     - No lost data: preserves full prompts, outputs, tool arguments, and artifacts.
     - Strict context isolation and star topology intact.

3. **Project Requirements**
   - [x] Create Tech Spec in `/plans/chatroom_markdown_ledger_tech_spec.md`.
   - [ ] Refactor ledger engine in `scripts/spawnAgents.ts` from `chatGroup.yaml` to `chatRoom.md`.
   - [ ] Implement clean Markdown parser in `ChatRoomLedger` to parse entries for CLI inspection.
   - [ ] Update CLI command descriptions and logging output references to `chatRoom.md`.
   - [ ] Update `/skills/spawn-agents/SKILL.md` documentation to reference `chatRoom.md`.
   - [ ] Validate compilation with `compile_applet` and test CLI commands.

4. **Architecture Decisions**
   - **Trade-offs**:
     - *Markdown vs YAML*: Markdown renders naturally in IDEs, GitHub, and preview tools. Using an H2 / frontmatter delimited entry format (`## [msg_001] 2026-10-05T02:00:00Z | SENDER -> RECIPIENT`) allows human readability while remaining deterministic to parse programmatically.
   - **Benefits**:
     - Rich formatting for code snippets, diffs, tool execution logs, and multiline model thoughts.
     - Zero YAML indentation or quoting errors when models generate complex nested strings or markdown within markdown.

5. **Pseudo Code (Written in Shade DSL)**
   ```dsl
   DATA:
     ChatRoomEntry: {
       id: string,
       timestamp: string,
       sender: { type: string, id: string, role?: string },
       recipient: { type: string, id: string, role?: string },
       channel: string,
       type: string,
       content: string,
       context?: { artifacts?: string[], tools?: string[] },
       artifacts?: string[],
       task?: string
     }

   LOGIC:
     FormatChatRoomMarkdown(entry):
       badge = entry.type.toUpperCase()
       md = `## [${entry.id}] ${entry.timestamp} | ${entry.sender.id} → ${entry.recipient.id} (${badge})\n`
       md += `**Channel**: \`${entry.channel}\` | **Type**: \`${entry.type}\``
       if entry.task: md += ` | **Task**: \`${entry.task}\``
       md += `\n`
       if entry.context.tools: md += `**Granted Tools**: ${entry.context.tools.join(', ')}\n`
       if entry.context.artifacts: md += `**Artifacts**: ${entry.context.artifacts.join(', ')}\n`
       md += `\n${entry.content}\n\n---\n`
       return md

     AppendChatRoom(projectDir, entry):
       filePath = `${projectDir}/chatRoom.md`
       if not exists(filePath):
         writeHeader(filePath, project)
       appendFile(filePath, FormatChatRoomMarkdown(entry))

   RENDER:
     CLIOutput:
       Display path as artifacts/{project-id}/chatRoom.md.
   ```
