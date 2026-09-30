# Tech Spec 

1. **Objective**
   - **Problem Statement**: Users and automated subagents need a repeatable, standardized skill (`/skills/google-workspace-cli/SKILL.md`) to install, configure, authenticate, diagnose, and execute commands using Google Workspace CLI (`gws`) without encountering libc compatibility issues or getting blocked on headless OAuth loopback callbacks.
   - **Solution Overview**: Author a production-grade agent skill complying with the Custom Skill Creation Protocols (YAML frontmatter, H1-delimited contexts) that covers binary installation (musl static build), authentication options (interactive loopback with callback forwarding, Desktop client credentials, direct token passing), schema inspection, and operational commands across all Google Workspace APIs (Drive, Gmail, Calendar, Sheets, Docs, Slides, Tasks).
   - **Scope**: Skill definition at `/skills/google-workspace-cli/SKILL.md`, test verification script in `/framer/test/`, and RCA reference in `/RCA/`.
   - **Context**: The user explicitly instructed: "Write new skill file then for this gws cli so that anyone can auth it & run it again & do stuff".

2. **Success Criteria**
   - **Skill Compliance**: Skill file is saved at `/skills/google-workspace-cli/SKILL.md` with valid YAML frontmatter (`name`, `description`) and H1-delimited contexts.
   - **Comprehensive Coverage**: Covers installation (static musl target), headless keyring configuration (`GOOGLE_WORKSPACE_CLI_KEYRING_BACKEND="file"`), interactive OAuth authentication with remote callback handling, token-based authentication (`GOOGLE_WORKSPACE_CLI_TOKEN`), and full command patterns for Google Drive, Gmail, Calendar, Sheets, Docs, Slides, and Tasks.
   - **Execution Reproducibility**: Any future agent or developer reading the skill can reproduce auth and execute commands without trial-and-error.

3. **Project Requirements**
   - [x] Formulate Tech Spec in `/plans/google_workspace_cli_skill_tech_spec.md`.
   - [x] Create `/skills/google-workspace-cli/SKILL.md` following Custom Skill Creation Protocols.
   - [x] Include installation steps for statically linked musl binary (`./bin/gws` & `/usr/local/bin/gws`).
   - [x] Document the 3 auth pathways: Direct token, Interactive loopback with container curl, and Desktop OAuth JSON (`~/.config/gws/client_secret.json`).
   - [x] Document common command recipes for Drive, Gmail, Calendar, Sheets, Docs, and Discovery schema querying.
   - [x] Document troubleshooting for `GLIBC_2.39`, `redirect_uri_mismatch`, and headless keyring backend.
   - [x] Run applet compilation and linting to ensure zero regressions.

4. **Architecture Decisions**
   - **Standard Skill Location (`/skills/google-workspace-cli/SKILL.md`)**: Matches the skill architecture specification defined in the agent guidelines.
   - **Multi-Method Authentication**: Documents both instant CI/automated tokens (`GOOGLE_WORKSPACE_CLI_TOKEN`) and persistent refresh-token OAuth flows (`gws auth login`) so developers in both interactive and automated environments can immediately succeed.
   - **Container-Aware Loopback Handling**: Explicitly details how to complete localhost OAuth redirects inside cloud containers where localhost on the user's browser does not map directly to the container without curl forwarding or SSH tunneling.

5. **Pseudo Code**
   ```dsl
   MODULE GoogleWorkspaceCliSkillDefinition:
     DATA:
       skillName: String = "google-workspace-cli"
       skillPath: String = "/skills/google-workspace-cli/SKILL.md"
       requiredContexts: List<String> = [
         "# Google Workspace CLI (gws)",
         "# Installation & Binary Setup",
         "# Keyring Backend Configuration",
         "# Authentication Methods",
         "# Container & Remote Development Callback Workflow",
         "# Common CLI Commands & Recipes",
         "# Discovery Engine & Dynamic Schema Querying",
         "# Troubleshooting & Error Recovery"
       ]

     LOGIC:
       FUNCTION generateSkill():
         ASSERT hasValidYamlFrontmatter(skillName)
         ASSERT allHeadersAreH1(requiredContexts)
         WRITE_FILE(skillPath, content)
         VERIFY_FILE_EXISTS(skillPath)
       END FUNCTION
   ```
