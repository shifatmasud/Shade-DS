# 🛠️ CLI Tools & Automation Scripts

This document provides a comprehensive list of all CLI tools and automation scripts available in the workspace, along with instructions on how to use them to automate tedious tasks.

---

## 🚀 Specialized CLI Skills (`/skills`)

These skills provide optimized patterns and binaries for interacting with cloud platforms and external services.

### 1. **Framer Agent (`framer-agent-cli`)**
- **What it does**: Programmatically manipulates Framer canvases using a custom DSL (Data, Logic, Render).
- **Automation**: Automate UI changes across multiple breakpoints, bulk update typography, or generate entire page sections from descriptions.
- **Command**: `npx -y @framer/agent@latest exec -s <session_id> -e "..."`

### 2. **GitHub CLI (`github-cli`)**
- **What it does**: Managed interaction with GitHub Repos, PRs, and Issues via `./bin/gh`.
- **Automation**: Automate branch creation, PR drafting, and secret management without leaving the terminal.
- **Command**: `./bin/gh pr create --title "..." --body "..."`

### 3. **Cloudflare Integration (`cloudflare-cli`)**
- **What it does**: Manages Cloudflare Workers, KV, D1, and R2 storage using `wrangler`.
- **Automation**: Use `wrangler deploy --temporary` for instant, accountless production previews that last 24 hours.
- **Command**: `npx wrangler deploy --temporary`

### 4. **Firecrawl CLI (`firecrawl-cli`)**
- **What it does**: Fast, reliable web scraping and browser interaction for AI agents.
- **Automation**: Automate competitive research, SEO audits, or data extraction from complex websites.
- **Command**: `firecrawl scrape https://example.com`

### 5. **Cloudinary CLI (`cloudinary-cli`)**
- **What it does**: Manages media assets via the `cld` binary in `./bin/cld`.
- **Automation**: Bulk upload images, optimize media assets, and search for tags programmatically.
- **Command**: `./bin/cld upload path/to/file.png`

### 6. **CLI Installer (`cli-installer`)**
- **What it does**: Standardizes the installation of Linux-compatible binaries into `./bin`.
- **Automation**: Use this to quickly bring in new tools (Go, Rust, etc.) while ensuring they persist in the workspace.

### 7. **Notion CLI (`notion-cli`)**
- **What it does**: Interacts with Notion pages, databases, and files using `ntn`.
- **Automation**: Automate report generation or database synchronization. **Pro Tip**: Use `NOTION_KEYRING=0` to bypass OS keychain errors in this environment.
- **Command**: `NOTION_KEYRING=0 npx ntn pages`

### 8. **Supabase CLI (`supabase-cli`)**
- **What it does**: Manages Supabase backends (DB, Auth, Edge Functions).
- **Automation**: **Automate Type Safety** by generating TypeScript types directly from your SQL schema.
- **Command**: `npx supabase gen types typescript --local > src/types/supabase.ts`

### 9. **Vercel CLI (`vercel-cli`)**
- **What it does**: Deploys and manages projects on Vercel.
- **Automation**: Use non-interactive flags to automate deployments from CI or the agent session.
- **Command**: `npx vercel --token="$VERCEL_TOKEN" --yes`

---

## 📜 Automation Scripts (`/scripts`)

Native scripts designed for high-level workspace orchestration and testing.

### 1. **Spawn Agents (`spawnAgents.ts`)**
- **Location**: `/scripts/spawnAgents.ts`
- **What it does**: A powerful multi-agent orchestrator powered by Gemini. It decomposes complex user requests into sub-tasks, assigns them to specialized virtual workers, and runs a final code audit.
- **Automation**: **Automate the entire development lifecycle**. Just describe a feature, and it will plan, code, and review it.
- **Usage**: `npx tsx scripts/spawnAgents.ts "Add a real-time analytics dashboard with Supabase integration"`

### 2. **Screenshot Utility (`screenshot.ts`)**
- **Location**: `/scripts/screenshot.ts`
- **What it does**: Captures PNG screenshots of URLs using Puppeteer and Browserless.
- **Automation**: Automate visual snapshots for documentation, bug reports, or preview generation.
- **Usage**: `npx tsx scripts/screenshot.ts` (Requires `BROWSERLESS_TOKEN`)

### 3. **JSX Decompiler (`decompile-jsx.cjs`)**
- **Location**: `/scripts/decompile-jsx.cjs`
- **What it does**: Analyzes JSX/React code and extracts structural metadata.
- **Automation**: Automate the conversion of React components into Shade DSL or other structured formats.

---

## ⚡ How to Automate "Boring Stuff"

| Task | Tool/Script | Strategy |
| :--- | :--- | :--- |
| **New Feature Implementation** | `spawnAgents.ts` | Pass the requirement to the orchestrator; let it manage the sub-agents. |
| **Instant Preview/Staging** | `cloudflare-cli` | Use `--temporary` deployments to share live links instantly. |
| **Research & Data Entry** | `firecrawl-cli` | Scrape target sites and pipe the output to a local JSON/Markdown file. |
| **Asset Optimization** | `cloudinary-cli` | Bulk upload media to Cloudinary for automatic transformation and CDN delivery. |
| **Project Synchronization** | `github-cli` | Use non-interactive flags (`--fill`, `--yes`) to automate PR and Issue flows. |
| **Visual Validation** | `screenshot.ts` | Run on every build to verify the UI state in a real browser. |
