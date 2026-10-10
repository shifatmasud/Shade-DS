# Tech Spec 

1. **Objective**
   - **Problem Statement**: The workspace separates executable scripts (`/scripts`) and behavioral skills (`/skills`), causing fragmented tool discovery and scattered paths. The user requested flat, named plugin folders under `/plugins/`, where every matched skill/script pair becomes a single plugin, and every single unmatched skill or script becomes an individual named plugin as well (with accompanying `SKILL.md` for standalone scripts).
   - **Solution Overview**: Establish a unified `/plugins` directory where every skill and script is organized into its own named plugin folder (`/plugins/<plugin-name>/`). Matched pairs will sit together in one plugin folder. Unmatched skills will each have their own plugin folder (`/plugins/<skill-name>/SKILL.md`). Unmatched standalone scripts will each have their own plugin folder (`/plugins/<script-name>/`) along with an accompanying `SKILL.md`.
   - **Scope**: Reorganize all workspace `/skills` and `/scripts` into `/plugins/<plugin-name>/`. Clean up and update all references in `package.json`, `AGENTS.md`, `TOOLS.md`, and individual plugin manifests. Maintain immunity for protected files (`/components/Section/Dock.tsx`, `README.md` core layout).
   - **Context**: Directly implements the user's revised directive: "named plugin folders... Every skill & script matched will be single plugin and single unmatched skill or script will be individual plugins too".

2. **Success Criteria**
   - **Key Results**:
     - All matched skill & script pairs consolidated into dedicated named plugin folders under `/plugins/<name>/`.
     - All unmatched standalone skills migrated to individual named plugin folders under `/plugins/<name>/`.
     - All unmatched standalone scripts migrated to individual named plugin folders under `/plugins/<name>/` with accompanying `SKILL.md` documentation.
     - All script execution references in `package.json`, `AGENTS.md`, `TOOLS.md`, and moved `SKILL.md` files updated to point to `/plugins/<name>/...`.
     - Scripts and build commands (`npm run lint`, `npm run tunnel:status`, `spawnAgents`) function without path breakage.
   - **Non-Negotiables**:
     - Zero edits to `/components/Section/Dock.tsx` (Dock Immunity).
     - README layout immunity respected.
     - Complete documentation of all tools with accompanying `SKILL.md`.

3. **Project Requirements**
   - [ ] Establish `/plugins` structure with named plugin folders:
     - **Matched Plugins (Skill + Script)**:
       - `plugins/figma-mcp/` (`SKILL.md` + `figma-mcp-server.ts`)
       - `plugins/upsy-mcp/` (`SKILL.md` + `upsy-mcp.ts`)
       - `plugins/mcp-cli/` (`SKILL.md` + `mcp-client.ts`)
       - `plugins/remote-mcp-host/` (`SKILL.md` + `mcp-tunnel.sh` + `test-remote-mcp.ts`)
       - `plugins/framer-agent-cli/` (`SKILL.md` + `framer_cli.ts`)
       - `plugins/framer-esm-sh-importer/` (`SKILL.md` + `references/` + `framer_esm_converter.ts`)
       - `plugins/framer-code-components-overrides/` (`SKILL.md` + `hacks/` + `references/` + `inspect_framer_page.ts` + `test_framer_component.ts`)
       - `plugins/browserless-screenshot/` (`SKILL.md` + `screenshot.ts`)
       - `plugins/browser-desktop/` (`SKILL.md` + `desktop_service.sh`)
       - `plugins/spawn-agents/` (`SKILL.md` + `spawnAgents.ts`)
       - `plugins/shader_dsl/` (`SKILL.md` + `analyze_lusion_shaders.ts` + `extract_lusion_shaders.ts`)
     - **Unmatched Standalone Skills (Individual Plugins)**:
       - `plugins/3d-light-design/`, `plugins/agent-debugging/`, `plugins/cli-installer/`, `plugins/cloudflare-cli/`, `plugins/cloudinary-cli/`, `plugins/decoupled-kinetic-scrub/`, `plugins/firecrawl-cli/`, `plugins/framer-motion-animateview-clip-origin/`, `plugins/framer-motion-gsap-css-bridge/`, `plugins/git/`, `plugins/github-cli/`, `plugins/google-workspace-cli/`, `plugins/modern-web-guidance/`, `plugins/notion-cli/`, `plugins/openmail-cli/`, `plugins/parasitic-dom-binding/`, `plugins/postprocessing-render-pipeline/`, `plugins/procedural-rigging/`, `plugins/r3f-3d-optimization/`, `plugins/shade_dsl/`, `plugins/supabase-cli/`, `plugins/technical-interviewer/`, `plugins/vercel-cli/`, `plugins/vite-dependency-repair/`
     - **Unmatched Standalone Scripts (Individual Plugins with accompanying SKILL.md)**:
       - `plugins/decompile-jsx/` (`decompile-jsx.cjs` + `SKILL.md`)
       - `plugins/pty-runner/` (`pty_runner.py` + `SKILL.md`)
       - `plugins/system-control/` (`System_Control.bat` + `SKILL.md`)
   - [ ] Move files to target plugin directories.
   - [ ] Generate accompanying `SKILL.md` for standalone script plugins (`decompile-jsx`, `pty-runner`, `system-control`).
   - [ ] Update `package.json` (`tunnel:status`, `tunnel:renew` scripts).
   - [ ] Update `AGENTS.md` and `TOOLS.md` references.
   - [ ] Update execution paths inside moved `SKILL.md` files.
   - [ ] Lint and test compilation.

4. **Architecture Decisions**
   - **Flat Named Plugin Hierarchy**: Instead of multi-tier nested domain folders, use clean top-level named directories under `plugins/` (`plugins/<name>/`). This delivers instant visual clarity and predictability.
   - **Unified Plugin Standard**: Every single capability in the system—whether a standalone skill, paired tool, or utility script—is represented consistently as a self-contained plugin with an accompanying `SKILL.md`.
   - **Atomic In-Plugin Scripts**: Scripts reside directly inside their named plugin folder (e.g. `plugins/figma-mcp/figma-mcp-server.ts`), making each plugin completely portable.

5. **Pseudo Code**
```shade
DATA PluginRegistry {
  pairedPlugins: [
    { name: "figma-mcp", skill: "skills/figma-mcp", script: "scripts/figma-mcp-server.ts" },
    { name: "upsy-mcp", skill: "skills/upsy-mcp", script: "scripts/upsy-mcp.ts" },
    { name: "mcp-cli", skill: "skills/mcp-cli", script: "scripts/mcp-client.ts" },
    { name: "remote-mcp-host", skill: "skills/remote-mcp-host", scripts: ["scripts/mcp-tunnel.sh", "scripts/test-remote-mcp.ts"] },
    { name: "framer-agent-cli", skill: "skills/framer-agent-cli", script: "scripts/framer_cli.ts" },
    { name: "framer-esm-sh-importer", skill: "skills/framer-esm-sh-importer", script: "scripts/framer_esm_converter.ts" },
    { name: "framer-code-components-overrides", skill: "skills/framer-code-components-overrides", scripts: ["scripts/inspect_framer_page.ts", "scripts/test_framer_component.ts"] },
    { name: "browserless-screenshot", skill: "skills/browserless-screenshot", script: "scripts/screenshot.ts" },
    { name: "browser-desktop", skill: "skills/browser-desktop", script: "scripts/desktop_service.sh" },
    { name: "spawn-agents", skill: "skills/spawn-agents", script: "scripts/spawnAgents.ts" },
    { name: "shader_dsl", skill: "skills/shader_dsl", scripts: ["scripts/analyze_lusion_shaders.ts", "scripts/extract_lusion_shaders.ts"] }
  ],
  standaloneScriptPlugins: [
    { name: "decompile-jsx", script: "scripts/decompile-jsx.cjs" },
    { name: "pty-runner", script: "scripts/pty_runner.py" },
    { name: "system-control", script: "scripts/System_Control.bat" }
  ]
}

LOGIC MigrateNamedPlugins() {
  FOREACH plugin IN PluginRegistry.pairedPlugins {
    targetDir = "plugins/" + plugin.name
    EnsureDirectory(targetDir)
    MoveSkillFiles(plugin.skill, targetDir)
    MoveScripts(plugin.scripts, targetDir)
  }
  FOREACH skill IN RemainingSkills() {
    targetDir = "plugins/" + skill.name
    MoveSkillDirectory(skill.path, targetDir)
  }
  FOREACH standaloneScript IN PluginRegistry.standaloneScriptPlugins {
    targetDir = "plugins/" + standaloneScript.name
    EnsureDirectory(targetDir)
    MoveScript(standaloneScript.script, targetDir)
    GenerateSkillMd(targetDir + "/SKILL.md", standaloneScript.name)
  }
}

LOGIC UpdateAllReferences() {
  UpdateFile("package.json", RewriteScriptPaths)
  UpdateFile("AGENTS.md", RewriteSpawnAgentsPaths)
  UpdateFile("TOOLS.md", RewriteAllToolPaths)
  UpdateSkillDocs(RewriteInternalReferences)
}
```
