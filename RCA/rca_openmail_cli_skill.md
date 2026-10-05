# Root Cause Analysis (RCA) & Implementation Report - OpenMail CLI Beginner Skill

## 1. Executive Summary
- **Artifact**: Custom Agent Skill created at `/skills/openmail-cli/SKILL.md`.
- **Target Audience**: Beginners and autonomous subagents seeking clear, step-by-step guidance for integrating and operating OpenMail CLI (`openmail`).
- **Core Problem Addressed**: Developers and agents frequently run into confusion regarding:
  1. Where and how to persist `OPENMAIL_API_KEY` without committing secrets.
  2. Why `openmail send` complains about missing `--inbox-id` when default inboxes are not set in `state.json`.
  3. The difference between polling `messages list` (which returns all mail) vs `threads list --is-read false` (which properly identifies unprocessed incoming mail).
  4. Conversation thread breakage caused by omitting `--thread-id` during replies.
  5. Security vulnerabilities arising from unvalidated email prompt injections.
- **Resolution**: Created a comprehensive, structured skill document adhering strictly to the Custom Skill Creation Protocols (valid YAML frontmatter and H1-delimited contexts).

---

## 2. Skill Architecture & Standards Compliance
- **File Location**: `/skills/openmail-cli/SKILL.md`
- **Frontmatter**:
  - `name`: `openmail-cli`
  - `description`: Complete overview of installation, auth, sending, threads, attachments, subagent delegation, security, and troubleshooting.
- **Context Structure**:
  - `# OpenMail CLI Skill`
  - `# 60-Second Quickstart`
  - `# Authentication & Configuration`
  - `# Core Recipes for Beginners`
  - `# Subagent Email Delegation`
  - `# Security: Untrusted Data Discipline`
  - `# Troubleshooting & Common Errors`

---

## 3. Key Concepts Emphasized for Beginners
1. **The 3-Tier Auth Resolution**:
   - Explicit flag (`--api-key`)
   - Environment variable (`OPENMAIL_API_KEY`)
   - Secret file (`.env` in project root or `savedApiKey` in `~/.openmail-cli/state.json`)
2. **Inbox Selection**:
   - `OPENMAIL_INBOX_ID` or `defaultInboxId` in `state.json` eliminates repetitive `--inbox-id` arguments.
3. **The Polling Rule**:
   - Always poll `threads list --is-read false` for incoming messages.
   - Always reply using `--thread-id` to avoid fragmented conversations.
4. **Subagent Scoping**:
   - Use `openmail inbox keys create --inbox-id <id>` to ensure subagents cannot tamper with parent inboxes.

---

## 4. Verification & Testing
- Tested CLI invocations against the live inbox `shifatmasud@omail.sh`.
- Verified command execution without requiring inline secrets.
- Verified compilation and build stability with `compile_applet`.
