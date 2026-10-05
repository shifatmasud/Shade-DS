# Tech Spec: ChatHistory Markdown Ledger for SpawnAgents

1. **Objective**
   - **Problem Statement**: The current multi-agent orchestrator records CLI communication in `chatGroup.yaml`. Markdown (`chatHistory.md`) provides superior visual readability, easier code formatting with fenced codeblocks, direct GitHub/IDE preview support, and native Markdown inspection for both humans and AI models.
   - **Solution Overview**: Replace `chatGroup.yaml` with `chatHistory.md` located at `/artifacts/{project-id}/chatHistory.md`. Implement a structured Markdown append logger and parser (`ChatHistoryLedger`) that formats all prompts, responses, tool calls, tool responses, decisions, and system messages as clean Markdown sections with timestamps, participants, role tags, and metadata badges.
   - **Scope & Context**:
     - Affects `/scripts/spawnAgents.ts` (`ChatHistoryLedger` class, file path, CLI `chat` command).
     - Updates `/skills/spawn-agents/SKILL.md` to reflect `chatHistory.md`.
     - Maintains backwards compatibility (checking for legacy `chatGroup.yaml` if `chatHistory.md` is not found when reading historical logs).

2. **Success Criteria**
   - **Key Results**:
     1. All communications recorded in `/artifacts/{project-id}/chatHistory.md`.
     2. Markdown formatting includes message headers, metadata line, sender ➔ recipient badges, and fenced code blocks for tool calls and prompts.
     3. CLI `npx tsx scripts/spawnAgents.ts chat <id> [--json]` works accurately with `chatHistory.md`.
     4. Applet compiles cleanly (`compile_applet` succeeds).
   - **Non-Negotiables**:
     - No lost communications (all prompts, tool calls, responses logged atomically).
     - Build and lint passes cleanly with zero errors.

3. **Project Requirements**
   - [x] Create plan in `/plans/chat_history_markdown_tech_spec.md`.
   - [ ] Implement `ChatHistoryLedger` in `scripts/spawnAgents.ts` targeting `chatHistory.md`.
   - [ ] Implement Markdown message parser in `ChatHistoryLedger.getMessages()`.
   - [ ] Update log messages and CLI outputs in `scripts/spawnAgents.ts`.
   - [ ] Update `/skills/spawn-agents/SKILL.md` documentation.
   - [ ] Verify compilation and test `chat` command via CLI.

4. **Architecture Decisions**
   - **Trade-offs**:
     - *YAML vs Markdown*: YAML is compact for key-value stores but cumbersome for multi-paragraph agent responses with embedded code blocks, quotes, or markdown. Markdown (`chatHistory.md`) natively supports nested code blocks, tables, and rich text without escaping quirks.
   - **Benefits**:
     - Zero escaping errors with agent-generated code snippets.
     - Human-friendly and AI-friendly readability directly inside any editor or terminal cat.

5. **Pseudo Code (Written in Shade DSL)**
   ```dsl
   DATA:
     ChatMessage: {
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
     ChatHistoryLedger:
       init(projectDir, projectName):
         filePath = path.join(projectDir, "chatHistory.md")
         if not exists(filePath):
           writeHeader("# Communication Ledger: " + projectName)

       appendMessage(msg):
         mdBlock = "## [" + msg.id + "] " + formatType(msg.type) + " | " + msg.sender.id + " ➔ " + msg.recipient.id + "\n"
         mdBlock += "**Timestamp:** `" + msg.timestamp + "` | **Channel:** `" + msg.channel + "`\n\n"
         if msg.context:
           mdBlock += formatContext(msg.context)
         mdBlock += formatContent(msg.content, msg.type) + "\n\n---\n\n"
         appendFile(filePath, mdBlock)

       getMessages():
         parseMarkdownSections(filePath)
   ```
