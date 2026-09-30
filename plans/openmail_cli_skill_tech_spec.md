# Tech Spec 

1. **Objective**
   - **Problem Statement**: New developers and autonomous subagents need a beginner-friendly, comprehensive, and production-grade guide to OpenMail CLI (`openmail`). Beginners often struggle with API key configuration, forgetting to set default inboxes, polling messages inefficiently instead of using unread threads, breaking thread continuity by omitting `--thread-id`, handling HTML/attachments, or exposing API keys.
   - **Solution Overview**: Author a complete agent skill at `/skills/openmail-cli/SKILL.md` complying strictly with Custom Skill Creation Protocols (YAML frontmatter with `name` and `description`, and H1-delimited contexts). The skill will provide:
     1. A 60-second quickstart from zero to sending and reading the first email.
     2. Comprehensive explanation of authentication hierarchy (`process.env`, `.env`, and `~/.openmail-cli/state.json`) and security discipline.
     3. Copy-paste recipes for core scenarios: sending emails, receiving and processing unread mail, replying in threads, extracting OTP/verification codes, and handling attachments.
     4. Subagent delegation patterns (scoped inboxes and scoped API keys).
     5. Troubleshooting common newbie stumbling blocks.
   - **Scope**: Skill document at `/skills/openmail-cli/SKILL.md`, tech spec at `/plans/openmail_cli_skill_tech_spec.md`, and RCA reference at `/RCA/rca_openmail_cli_skill.md`.
   - **Context**: Autonomous agent email infrastructure and developer documentation.

2. **Success Criteria**
   - **Protocols Compliance**: Valid YAML frontmatter, valid markdown syntax, and all major sections separated by H1-delimited headers (`# Header`).
   - **Newbie-Friendly**: Explains key concepts intuitively without assumed prior knowledge.
   - **Recipe Coverage**: Covers CLI installation, auth setup, sending, polling unread threads, thread replies, OTP extraction, subagents, and security policies.
   - **Non-Breaking**: Builds and lints cleanly with zero regressions.

3. **Project Requirements**
   - [x] Create Tech Spec in `/plans/openmail_cli_skill_tech_spec.md`.
   - [x] Create `/skills/openmail-cli/SKILL.md` following Custom Skill Creation Protocols.
   - [x] Document 60-second quickstart recipe.
   - [x] Document configuration sources and state management.
   - [x] Document beginner recipes: sending, thread tracking, reading unread messages, attachments.
   - [x] Document subagent isolation pattern with scoped keys.
   - [x] Document email security and prompt injection prevention.
   - [x] Document troubleshooting for common errors.
   - [x] Record RCA and implementation summary in `/RCA/rca_openmail_cli_skill.md`.

4. **Architecture Decisions**
   - **Standard Skill Directory**: Placed at `/skills/openmail-cli/SKILL.md` to adhere to the standard `/skills/<skill-name>/SKILL.md` conventions.
   - **H1 Header Architecture**: Every major context is delimited with an H1 header (`# Context Name`) per the agent skill creation rules.
   - **Focus on Antipatterns**: Explicitly highlights common mistakes beginners make (e.g. polling `messages list` instead of `threads list --is-read false`, omitting `--thread-id` when replying, hardcoding API keys).

5. **Pseudo Code**
   ```dsl
   MODULE OpenMailCliSkillSpec:
     DATA:
       skillName: String = "openmail-cli"
       skillFile: String = "/skills/openmail-cli/SKILL.md"
       sections: List<String> = [
         "# OpenMail CLI Skill",
         "# 60-Second Quickstart",
         "# Authentication & Configuration",
         "# Core Recipes for Beginners",
         "# Thread Management & Conversations",
         "# Subagent Email Delegation",
         "# Security: Untrusted Data Discipline",
         "# Troubleshooting & Common Errors"
       ]

     LOGIC:
       FUNCTION generateSkill():
         VERIFY_PROTOCOLS(yamlFrontmatter, h1Headers)
         WRITE_FILE(skillFile, content)
         VERIFY_FILE(skillFile)
   ```
