# Tech Spec 

1. **Objective**
   - **Problem Statement**: In Framer code components, standard bare npm imports (e.g., `three`, `gsap`, `canvas-confetti`, `lucide-react`) often fail to resolve, get blocked by Framer's aggressive/stale npm cache, or break standalone portability when components are copied across projects. However, blindly converting all imports to CDN URLs breaks the Framer canvas runtime if core host packages (`react`, `framer`, `framer-motion`) are rewritten, leading to duplicate React runtime crashes ("Invalid hook call") and disconnected Framer property control bindings.
   - **Solution Overview**: Formulate an exhaustive architectural analysis of `esm.sh` and author a comprehensive, production-grade agent skill (`skills/framer-esm-sh-importer/SKILL.md`) with companion references, hacks, and an automated transformation CLI utility (`scripts/framer_esm_converter.ts`). The skill enforces strict rules: rewrite all non-host npm dependencies to pinned `esm.sh` URLs while strictly preserving bare specifiers for `react`, `react-dom`, `framer`, and `framer-motion`. For React-dependent 3rd-party packages, enforce `?external=react,react-dom`.
   - **Scope**: All Framer code components located in `/framer/` and `/framer/test/`, skill documentation under `/skills/framer-esm-sh-importer/`, and skill registration in `/AGENTS.md`. Non-framer components (such as `/components/Core/`, `/components/Package/`, `/components/Page/`) use standard Vite local resolution and are left untouched.
   - **Context**: Framer Canvas & preview environments run headless or in-browser sandboxes where standalone components must be completely self-contained with zero local `node_modules` requirements.

2. **Success Criteria**
   - **Exhaustive esm.sh Analysis**: Deep technical analysis covering protocol syntax, version pinning, React peer dependency externalization (`?external=react,react-dom`), subpaths, query parameters, bundle modes, DTS typing, and runtime CSP safety.
   - **Skill Specification Quality**: Complete `skills/framer-esm-sh-importer/SKILL.md` with YAML frontmatter, H1-delimited contexts, transformation rules, pattern catalog, troubleshooting guide, and edge-case handling.
   - **The Trio Immunity Rule**: Absolute immunity for `react`, `framer`, and `framer-motion` (plus `react-dom` and `react/jsx-runtime`). Never rewrite these to `esm.sh`.
   - **Automation Utility**: An executable script `scripts/framer_esm_converter.ts` capable of scanning, analyzing, dry-running, and converting Framer components.
   - **Stand-alone Verification**: Inspect and audit existing `/framer/` files (e.g., ensuring `framer/test/LusionCursorTrail.tsx` uses esm.sh for `three` while preserving `react`, `framer`, and `framer-motion`).
   - **Build & Typecheck Cleanliness**: TypeScript compilation (`npx tsc --noEmit`) passes cleanly with zero fatal errors.

3. **Project Requirements**
   - [x] Analyze `esm.sh` internals, CDN routing, parameters (`?external`, `?bundle`, `?target`, `?dev`), and Framer runtime constraints.
   - [ ] Author `skills/framer-esm-sh-importer/SKILL.md` adhering strictly to Custom Skill Creation Protocols (valid YAML frontmatter, H1-delimited contexts).
   - [ ] Author reference guide `skills/framer-esm-sh-importer/references/esm-query-matrix.md` detailing all parameters and package configurations.
   - [ ] Author reference guide `skills/framer-esm-sh-importer/references/framer-import-rules.md` detailing the Trio Immunity and React singleton mechanics.
   - [ ] Author transformation utility `scripts/framer_esm_converter.ts` with CLI arguments (`--scan`, `--convert`, `--file <path>`).
   - [ ] Update `AGENTS.md` to register the new `framer-esm-sh-importer` skill in Skill Activation.
   - [ ] Verify standalone status of components in `/framer/` (ensuring `framer/test/Morphine V2.tsx` / `Morphine_Latest.tsx` preserves all `animateView` code).
   - [ ] Run `compile_applet` and typecheck to ensure zero regressions.

4. **Architecture Decisions**
   - **Trade-offs**:
     - *Full AST Parsing vs Robust Regex Scanner*: Regex tokenizers combined with import pattern matchers provide lightweight, ultra-fast script execution and zero runtime dependencies, handling standard `import ... from "pkg"`, `import type`, `export * from "pkg"`, and dynamic `import("pkg")`.
     - *Dynamic vs Pinned Versions*: Pinned versions (e.g. `three@0.183.2`, `gsap@3.12.5`) avoid upstream breaking changes and bypass Framer's unpredictable package cache.
     - *Why not transform applet components (`/components/`)*: The applet is built via Vite with local `package.json` resolution and HMR. Rewriting Vite applet components to remote CDN URLs creates unnecessary latency and offline fragility. Restricting transformation strictly to `/framer/` respects the boundary of Framer Code Components.
   - **Trio Exception Specification**:
     - Denylist: `react`, `react-dom`, `react/jsx-runtime`, `react/jsx-dev-runtime`, `framer`, `framer-motion`.
     - Allowlist for CDN rewrite: All other bare npm packages (e.g., `three`, `gsap`, `canvas-confetti`, `lucide-react`, `chroma-js`, `zustand`, `date-fns`, `howler`, etc.).
     - Conditional query parameter: If the dependency is known to consume React hooks or JSX (e.g., `@gsap/react`, `lucide-react`, `@react-three/fiber`), automatically append `?external=react,react-dom`.

5. **Pseudo Code**
   ```shade
   // Shade DSL Specification: Framer ESM Transformation Pipeline
   DATA {
     hostImmunityPackages: [
       "react",
       "react-dom",
       "react/jsx-runtime",
       "react/jsx-dev-runtime",
       "framer",
       "framer-motion"
     ],
     reactEcosystemPackages: [
       "@gsap/react",
       "lucide-react",
       "@react-three/fiber",
       "@react-three/drei",
       "zustand"
     ],
     cdnBaseUrl: "https://esm.sh/"
   }

   LOGIC {
     FUNCTION isImmune(specifier: String) -> Boolean {
       RETURN hostImmunityPackages.CONTAINS(specifier)
     }

     FUNCTION isLocalOrUrl(specifier: String) -> Boolean {
       RETURN specifier.STARTS_WITH(".") OR 
              specifier.STARTS_WITH("/") OR 
              specifier.STARTS_WITH("http://") OR 
              specifier.STARTS_WITH("https://")
     }

     FUNCTION buildEsmUrl(pkgName: String, subpath: String, version: String?) -> String {
       LET base = cdnBaseUrl + pkgName + (version ? "@" + version : "") + (subpath ? "/" + subpath : "")
       IF reactEcosystemPackages.CONTAINS(pkgName) THEN
         RETURN base + "?external=react,react-dom"
       END IF
       RETURN base
     }

     FUNCTION transformImports(sourceCode: String, packageVersions: Map) -> String {
       MATCH (importPattern IN sourceCode) {
         LET specifier = EXTRACT_SPECIFIER(importPattern)
         IF isImmune(specifier) OR isLocalOrUrl(specifier) THEN
           PRESERVE_EXACT(importPattern)
         ELSE
           LET (pkgName, subpath) = PARSE_PACKAGE_AND_SUBPATH(specifier)
           LET version = packageVersions.GET(pkgName)
           LET esmUrl = buildEsmUrl(pkgName, subpath, version)
           REPLACE_SPECIFIER(importPattern, esmUrl)
         END IF
       }
     }
   }

   RENDER {
     OUTPUT "Autonomous skill and verification suite deployed to /skills/framer-esm-sh-importer/ and /scripts/framer_esm_converter.ts"
   }
   ```
