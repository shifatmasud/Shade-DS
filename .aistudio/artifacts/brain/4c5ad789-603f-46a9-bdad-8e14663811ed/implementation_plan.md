# Unified Named Plugins Directory Architecture Plan

Consolidate all skills and scripts into individual named plugin folders under `/plugins/`. Every matched skill and script is merged into a single plugin package, and every single unmatched skill or script is established as an individual named plugin (with accompanying `SKILL.md` for standalone scripts).

## User Review & Critical Decisions

> [!IMPORTANT]
> The following updated architecture parameters are incorporated:
> - **Flat Named Plugin Hierarchy**: Instead of nested domain subdirectories, each plugin has its own top-level named folder under `/plugins/<plugin-name>/`.
> - **Matched Plugins**: Matched skills and scripts are co-located in the same plugin folder (`plugins/<name>/SKILL.md` + scripts).
> - **Standalone Skills**: Every standalone skill becomes its own named plugin directory (`plugins/<name>/SKILL.md`).
> - **Standalone Scripts**: Every standalone script becomes its own named plugin directory (`plugins/<name>/`) with an accompanying `SKILL.md` generated to document its usage.
> - **Direct Path Updates**: All script commands and references in `package.json`, `AGENTS.md`, and `TOOLS.md` will be directly updated to point to `/plugins/<name>/...`.

## 1. Overview & Core Concept

- **What It Does**: Unifies the entire skills and automation ecosystem into a single, clean `/plugins/` directory where every capability is a self-contained, named package.
- **Target Audience / Persona**: AI agents, developer tooling, and automated workflows.
- **Key Value**: Provides clean 1-to-1 modularity, eliminates cross-directory sprawl, gives every script clear behavioral documentation, and keeps root project structure uncluttered.

## 2. Directory Layout & Module Structure

```
/plugins/
├── [Matched Skill + Script Plugins]
│   ├── figma-mcp/                     (SKILL.md + figma-mcp-server.ts)
│   ├── upsy-mcp/                      (SKILL.md + upsy-mcp.ts)
│   ├── mcp-cli/                       (SKILL.md + mcp-client.ts)
│   ├── remote-mcp-host/               (SKILL.md + mcp-tunnel.sh, test-remote-mcp.ts)
│   ├── framer-agent-cli/              (SKILL.md + framer_cli.ts)
│   ├── framer-esm-sh-importer/        (SKILL.md + references/ + framer_esm_converter.ts)
│   ├── framer-code-components-overrides/ (SKILL.md + hacks/ + references/ + inspect_framer_page.ts, test_framer_component.ts)
│   ├── browserless-screenshot/        (SKILL.md + screenshot.ts)
│   ├── browser-desktop/               (SKILL.md + desktop_service.sh)
│   ├── spawn-agents/                  (SKILL.md + spawnAgents.ts)
│   └── shader_dsl/                    (SKILL.md + analyze_lusion_shaders.ts, extract_lusion_shaders.ts)
│
├── [Standalone Skills as Individual Plugins]
│   ├── 3d-light-design/               (SKILL.md)
│   ├── agent-debugging/               (SKILL.md)
│   ├── cli-installer/                 (SKILL.md)
│   ├── cloudflare-cli/                (SKILL.md)
│   ├── cloudinary-cli/                (SKILL.md)
│   ├── decoupled-kinetic-scrub/       (SKILL.md)
│   ├── firecrawl-cli/                 (SKILL.md)
│   ├── framer-motion-animateview-clip-origin/ (SKILL.md + animateView.md)
│   ├── framer-motion-gsap-css-bridge/ (SKILL.md + CSSxFramerMotion.md + parasitic-splittext-mask-slide/)
│   ├── git/                           (SKILL.md)
│   ├── github-cli/                    (SKILL.md)
│   ├── google-workspace-cli/          (SKILL.md)
│   ├── modern-web-guidance/           (SKILL.md)
│   ├── notion-cli/                    (SKILL.md)
│   ├── openmail-cli/                  (SKILL.md)
│   ├── parasitic-dom-binding/         (SKILL.md)
│   ├── postprocessing-render-pipeline/ (SKILL.md)
│   ├── procedural-rigging/            (SKILL.md)
│   ├── r3f-3d-optimization/           (SKILL.md)
│   ├── shade_dsl/                     (SKILL.md)
│   ├── supabase-cli/                  (SKILL.md)
│   ├── technical-interviewer/         (SKILL.md)
│   ├── vercel-cli/                    (SKILL.md)
│   └── vite-dependency-repair/        (SKILL.md)
│
└── [Standalone Scripts as Individual Plugins with Accompanying SKILL.md]
    ├── decompile-jsx/                 (decompile-jsx.cjs + SKILL.md)
    ├── pty-runner/                    (pty_runner.py + SKILL.md)
    └── system-control/                (System_Control.bat + SKILL.md)
```

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Individual Flat Plugin Directories**
  - *Chosen Approach*: Every tool and capability exists in `/plugins/<name>/`.
  - *Why*: Immediate findability without multi-level folder traversal. Matches user preference exactly.
- **Decision 2: Comprehensive Tool Documentation**
  - *Chosen Approach*: Create accompanying `SKILL.md` for standalone scripts (`decompile-jsx`, `pty-runner`, `system-control`) to uphold the user rule requiring `SKILL.md` for all tools.
  - *Why*: Ensures agents and developers know when and how to invoke every script.
- **Decision 3: Direct Reference Rewriting**
  - *Chosen Approach*: Update `package.json`, `AGENTS.md`, and `TOOLS.md` references to point to the new `/plugins/<name>/...` locations.
  - *Why*: Prevents stale references and eliminates confusion over old `/scripts` or `/skills` paths.

## 4. Execution Steps

1. **Establish Plugins Structure**: Create the target plugin directories in `/plugins/`.
2. **Migrate Matched Skills & Scripts**: Move each matched skill and script into its corresponding `/plugins/<name>/` folder.
3. **Migrate Standalone Skills**: Move all remaining skills from `/skills/` into individual `/plugins/<name>/` folders.
4. **Migrate Standalone Scripts & Add SKILL.md**: Move remaining scripts into `/plugins/<name>/` and generate standard `SKILL.md` documentation for each.
5. **Update Project References**:
   - `package.json`: Update `tunnel:status` and `tunnel:renew` paths.
   - `AGENTS.md`: Update `spawnAgents.ts` and skill references.
   - `TOOLS.md`: Update script locations and command examples.
   - Plugin `SKILL.md` files: Update internal path references.
6. **Clean Up & Verification**:
   - Remove now-empty `/skills` and `/scripts` directories if applicable.
   - Run `npm run lint` and verify execution.
