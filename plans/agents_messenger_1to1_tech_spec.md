# Tech Spec: Dedicated /agents-messenger 1:1 Direct Agent Communication System

1. **Objective**
   - **Problem Statement**: While `chatRoom.md` provides an aggregated chronological ledger for the entire multi-agent project, inspecting or isolating direct 1:1 interactions with a specific agent (e.g. `manager.md`, `strategist.md`, `builder.md`, `reviewer.md`) requires filtering through the global stream. Users and agents need dedicated per-agent communication channels where 1:1 exchanges are cleanly separated into their own markdown files.
   - **Solution Overview**: Implement an automated `/agents-messenger` subsystem within the workspace (and mirrored in `/artifacts/{project-id}/agents-messenger`). Every agent role and custom spawned agent receives its own dedicated `agent-name.md` file (e.g. `manager.md`, `strategist.md`, `builder.md`, `reviewer.md`, `researcher.md`, `analyst.md`, `tester.md`, `fixer.md`). When Manager communicates with an agent (or when a 1:1 message is sent), the interaction is mirrored directly into both the sender's and recipient's dedicated markdown messenger files as well as the global `chatRoom.md`.
   - **Scope & Context**:
     - Create and manage `/agents-messenger` folder.
     - Automatically create individual `agent-name.md` files upon agent registration or invocation.
     - Dual-write messaging: append interactions to global `chatRoom.md` AND individual `/agents-messenger/{agent-name}.md` files.
     - Add CLI subcommands:
       - `npx tsx scripts/spawnAgents.ts messenger list [--json]`
       - `npx tsx scripts/spawnAgents.ts messenger read <agent-name> [--json]`
       - `npx tsx scripts/spawnAgents.ts messenger send <from-agent> <to-agent> "<message>" [--project <id>] [--json]`
     - Update `/skills/spawn-agents/SKILL.md` to document the 1:1 messenger architecture.

2. **Success Criteria**
   - **Key Results**:
     1. Dedicated `/agents-messenger/` directory created with per-agent markdown files (`manager.md`, `strategist.md`, `builder.md`, etc.).
     2. All agent interactions automatically sync into their respective 1:1 message threads in `/agents-messenger/{agent-name}.md`.
     3. Direct 1:1 messaging via `messenger send` invokes the target agent with fresh context and logs the round-trip conversation to `/agents-messenger/{agent-name}.md`.
     4. `messenger list` and `messenger read` commands work for both human terminal display and `--json` machine output.
   - **Non-Negotiables**:
     - Strict context isolation maintained.
     - Clean, readable Markdown formatting with timestamps and message type badges.
     - Full build and lint passing.

3. **Project Requirements**
   - [x] Create Tech Spec in `/plans/agents_messenger_1to1_tech_spec.md`.
   - [ ] Implement `AgentsMessengerEngine` in `scripts/spawnAgents.ts` managing `/agents-messenger/` and per-agent `.md` files.
   - [ ] Hook `spawnFreshAgent` and `ManagerOrchestrator` to log 1:1 dialogue to `/agents-messenger/{agent-name}.md`.
   - [ ] Add CLI commands `messenger list`, `messenger read <agent>`, and `messenger send <from> <to> "<msg>"`.
   - [ ] Update `/skills/spawn-agents/SKILL.md` with `/agents-messenger` documentation.
   - [ ] Verify execution with `compile_applet` and CLI tests.

4. **Architecture Decisions**
   - **Trade-offs**:
     - *Root `/agents-messenger` vs Project-scoped `/artifacts/{project-id}/agents-messenger`*: We support both! The root `/agents-messenger` provides immediate root-level access and fast terminal inspection for active agents, while `/artifacts/{project-id}/agents-messenger` preserves the project's historical state.
   - **Benefits**:
     - Inspecting an individual agent's thoughts, instructions, and outputs is instant by simply reading `/agents-messenger/{agent-name}.md`.
     - 1:1 human-to-agent interactions can be dispatched without starting a full project pipeline.

5. **Pseudo Code (Written in Shade DSL)**
   ```dsl
   DATA:
     MessengerEntry: {
       id: string,
       timestamp: string,
       sender: { id: string, role?: string, type: string },
       recipient: { id: string, role?: string, type: string },
       channel: "1:1" | "manager" | string,
       type: "prompt" | "response" | "tool_call" | "tool_response",
       content: string,
       tools?: string[],
       artifacts?: string[]
     }

   LOGIC:
     AgentsMessengerEngine:
       baseDir: "/agents-messenger"
       
       InitAgentFile(agentName, role):
         filePath = `${baseDir}/${agentName}.md`
         if not exists(filePath):
           header = `# Agent 1:1 Messenger: ${agentName} (${role})\n`
           header += `- **Agent**: \`${agentName}\`\n- **Role**: \`${role}\`\n- **Created**: \`${now()}\`\n\n---\n`
           write(filePath, header)

       Log1to1Message(msg):
         formatted = FormatMarkdownEntry(msg)
         senderFile = `${baseDir}/${msg.sender.id}.md`
         recipientFile = `${baseDir}/${msg.recipient.id}.md`
         append(senderFile, formatted)
         if msg.recipient.id != msg.sender.id:
           append(recipientFile, formatted)

     SendMessageCLI(fromAgent, toAgent, messageText):
       InitAgentFile(fromAgent)
       InitAgentFile(toAgent)
       Log1to1Message(promptEntry)
       response = SpawnFreshAgent(role: toAgent, task: messageText)
       Log1to1Message(responseEntry)
       return response

   RENDER:
     CLIOutput:
       Display thread in formatted colors or JSON.
   ```
