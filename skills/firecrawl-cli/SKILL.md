---
name: firecrawl-cli
description: |
  Firecrawl CLI gives AI agents and apps fast, reliable web context with
  strong search, scraping, and interaction tools. One install command
  sets up three skill segments: live CLI tools, app-integration build
  skills, and outcome-focused workflow skills. Route the reader to the
  right usage path after install.
---

# Firecrawl CLI

Firecrawl provides fast, reliable web context for AI agents and applications, combining search, scraping, and interaction tools.

## Install

Run this command to install the CLI, build skills, and workflow tools:

```bash
npx -y firecrawl-cli@latest init --all --browser
```

## Skill Segments

| Segment         | Job                                                   | Where it runs                                 |
| --------------- | ----------------------------------------------------- | --------------------------------------------- |
| **CLI tools**   | Fetch web data *now* during agent session.            | Agent's terminal session                      |
| **Build skills**| Integrate Firecrawl into product codebase.            | User's product code                           |
| **Workflow**    | Produce finished deliverable (reports, research).     | Agent's session, producing artifact           |

## Routing Guide (Choose Your Path)

1.  **Need web data now?** -> **Path A: Live Web Tools**
    Use for searching, scraping, or interaction during your active session.
2.  **Need to integrate into an app?** -> **Path B: Integrate into App**
    Use for coding features that run in production using `FIRECRAWL_API_KEY`.
3.  **Need a finished deliverable?** -> **Path C: Repeatable Workflows**
    Use for research briefs, SEO audits, lead lists, or competitive intel.
4.  **Need Auth/API key?** -> **Path D: Auth/Credentials**
    Use for signing in or creating an account via browser/CLI.

## Verification

Before doing real work, verify the install:

```bash
mkdir -p .firecrawl
firecrawl --status
firecrawl scrape "https://firecrawl.dev" -o .firecrawl/install-check.md
```

*For complete docs, see: https://docs.firecrawl.dev*
