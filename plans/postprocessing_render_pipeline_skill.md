# Tech Spec

1. **Objective**
   - **Problem Statement**: Post-processing pipelines in Three.js and React Three Fiber (R3F) often suffer from pixelation/blurriness due to missing DPR scaling, color shifts and brightness degradation due to mismatched color spaces, and heavy performance overhead on screen-wide effects when full-screen math is computed everywhere.
   - **Solution Overview**: Create a comprehensive `postprocessing-render-pipeline` skill document in `/skills/postprocessing-render-pipeline/SKILL.md` that standardizes EffectComposer setup, multi-pass rendering, offscreen MSAA render target setup with dynamic DPR scaling, exact color space alignment (`gl.outputColorSpace`), and localized masking optimizations (early-exit in GLSL composite shaders).
   - **Scope**: Create `/skills/postprocessing-render-pipeline/SKILL.md` with complete YAML frontmatter, H1-delimited sections, architectural guidelines, technical specs, GLSL/TypeScript code patterns, and ShadeR DSL representations.
   - **Context**: Integrates into the agent skill library to guide postprocessing, EffectComposer, screen-wide fluid simulation passes, and hybrid 3D scene render pipelines.

2. **Success Criteria**
   - File `/skills/postprocessing-render-pipeline/SKILL.md` is created with valid YAML frontmatter (`name: postprocessing-render-pipeline`, `description`).
   - Uses H1-delimited headers as required by Custom Skill Creation Protocols in `AGENTS.md`.
   - Detailed coverage of:
     1. DPR-Scaled Offscreen Buffers (dynamic `devicePixelRatio` calculation matching physical viewport).
     2. Color Space Alignment (`gl.outputColorSpace` synchronization with render target texture `colorSpace = gl.outputColorSpace` / `SRGBColorSpace`).
     3. Strict Localized Masking (early-exit condition in composite GLSL shader where alpha <= 0.0 outputs pristine original 3D scene).
     4. Full EffectComposer architecture for screen-wide fluid simulation overlay on top of standard 3D scene render passes.
     5. Concrete TypeScript / GLSL implementation code snippets and ShadeR DSL representations.

3. **Project Requirements**
   - [x] Draft technical specification plan in `/plans/postprocessing_render_pipeline_skill.md`.
   - [ ] Create `/skills/postprocessing-render-pipeline/SKILL.md` with YAML frontmatter, H1 headers, and complete guidelines.
   - [ ] Verify formatting and completeness.

4. **Architecture Decisions**
   - **File Location**: `/skills/postprocessing-render-pipeline/SKILL.md` to follow standard skill location conventions.
   - **YAML Frontmatter**: Standard `name` and `description` fields for skill activation.
   - **Shader / Code Structure**: Include clean, production-grade TypeScript (Three.js / R3F) examples and GLSL snippet examples illustrating EffectComposer, render targets, color space setup, DPR scaling, and early-exit branching in fragment shaders.

5. **Pseudo Code (ShadeR DSL)**
   ```yaml
   Stage: @fragment
   
   Input:
     - tScene: texture
     - tFluid: texture
     - vUv: vec2
   
   Process:
     - Node: Localized Masking Composite
       inputs:
         - tScene: texture
         - tFluid: texture
         - vUv: vec2
       outputs:
         - fragColor: vec4
       function: pure
       logic: |
         Sample fluid state at vUv.
         If fluid.a <= 0.0:
           Return sample(tScene, vUv) directly (Early Exit).
         Else:
           Calculate refraction offset based on fluid.xy.
           Blend refracted tScene sample with fluid dye color.
   
   Output:
     - fragColor: vec4
   ```
