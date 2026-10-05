# Tech Spec 

1. **Objective**
   - **Problem Statement**: The user wants to run multiple agents together with `puppeteer-core` and Browserless to reverse-engineer and collect all WebGL/WebGPU shaders from `https://lusion.co/`, with a special focus on the interactive cursor movement trail shaders (fluid/ribbon/particle/displacement simulation), and write custom scripts to capture, deobfuscate, organize, translate to ShadeR DSL, and provide testable implementations.
   - **Solution Overview**: 
     1. Build an automated reverse-engineering script (`scripts/extract_lusion_shaders.ts`) using Puppeteer-Core connecting to the Browserless cloud rendering cluster (`wss://production-sfo.browserless.io`).
     2. Inject pre-hydration WebGL and WebGL2 instrumentation hooks into `window` prototype methods (`createShader`, `shaderSource`, `compileShader`, `createProgram`, `attachShader`, `linkProgram`, `useProgram`, `uniform*`, `drawArrays`, `drawElements`) prior to any page initialization.
     3. Drive realistic cursor motion patterns (continuous curves, figure-8 loops, spirals, rapid acceleration swipes, hover scrubs) across the WebGL canvas while recording real-time uniform updates, texture passes, and draw calls tied to mouse movement.
     4. Capture high-resolution visual screenshots of the cursor trail effects and host them via the screenshot upload pipeline.
     5. Orchestrate multi-agent analysis (`scripts/analyze_lusion_shaders.ts` / multi-agent pipeline) to deobfuscate, annotate, and classify every shader program (cursor trail advection, particle spring physics, curl noise distortion, bloom/chromatic post-processing, PBR materials).
     6. Translate the cursor trail shader architecture into the strict ShadeR DSL specification (`@compute`, `@vertex`, `@fragment` with IPO Node Graph format).
     7. Provide a standalone interactive test component in `/framer/test/LusionCursorTrail.tsx` reproducing the cursor trail shader mechanism.
   - **Scope**: Reverse-engineering WebGL pipeline of `lusion.co`, extracting all vertex/fragment shader programs, capturing cursor trail dynamics, analyzing math models, producing ShadeR DSL specs, generating artifacts in `/artifacts/lusion_shaders/`, and creating a test implementation in `/framer/test/`.
   - **Context**: Advanced GPGPU shader reverse-engineering and ShadeR DSL translation using automated cloud headless browser automation.

2. **Success Criteria**
   - **Key Results**:
     - Connect to Browserless cloud browser via WebSocket and navigate to `https://lusion.co/`.
     - Successfully intercept and capture 100% of compiled WebGL/WebGL2/WebGPU shaders from the live site session.
     - Isolate and document the cursor move trail shader programs (uniforms, vertex/fragment code, advection/velocity buffers).
     - Save all raw GLSL shaders into organized files in `/artifacts/lusion_shaders/`.
     - Generate a comprehensive reverse-engineering report (`/artifacts/lusion_shaders/LUSION_SHADER_ANALYSIS.md`) detailing the cursor trail physics, uniforms, and pipeline stages.
     - Provide full ShadeR DSL node graph definitions for the cursor trail system.
     - Implement an interactive test component in `/framer/test/LusionCursorTrail.tsx` adhering to the project's design system and Theme tokens.
   - **Non-Negotiables & Criteria**:
     - Strict adherence to `AGENTS.md` (no modifications to protected files like `Dock.tsx`, no extra icon libraries, proper Theme token usage).
     - No exposure of raw API tokens in logged outputs.
     - Compile and lint verification clean.

3. **Project Requirements**
   - [ ] Formulate planning spec in `/plans/lusion_shaders_reverse_engineering_tech_spec.md`.
   - [ ] Develop `scripts/extract_lusion_shaders.ts` with deep WebGL/WebGL2 API proxy hooks:
     - Hook `WebGLRenderingContext` and `WebGL2RenderingContext` methods.
     - Intercept `shaderSource`, track shader type (`VERTEX_SHADER` vs `FRAGMENT_SHADER`).
     - Map programs to their attached shaders, active uniforms, and draw counts.
     - Track mouse movement event correlation with shader calls during cursor trails.
     - Emulate mouse trails and capture screenshots of the active effect.
   - [ ] Execute `scripts/extract_lusion_shaders.ts` via Browserless against `https://lusion.co/`.
   - [ ] Develop multi-agent analyzer `scripts/analyze_lusion_shaders.ts` to inspect collected shaders, decompose math algorithms (Simplex/Perlin/Curl noise, fluid velocity advection, ribbon instancing, specular highlights), and isolate the cursor trail pipeline.
   - [ ] Write the deobfuscated and formatted shaders to `/artifacts/lusion_shaders/`.
   - [ ] Produce formal ShadeR DSL IPO architecture specifications for the cursor trail system in the analysis report and plan.
   - [ ] Build `/framer/test/LusionCursorTrail.tsx` with a high-performance WebGL/Three.js interactive cursor trail simulation.
   - [ ] Update `README.md` changelog to record the shader reverse-engineering milestone.
   - [ ] Validate compilation and lint with `compile_applet`.

4. **Architecture Decisions**
   - **Pre-Navigation Hooking (`evaluateOnNewDocument`)**:
     - Must hook `window.WebGLRenderingContext.prototype` and `window.WebGL2RenderingContext.prototype` before any Three.js or custom engine bundles are evaluated. This ensures zero shaders escape interception.
   - **Program & Uniform Introspection**:
     - Wrap `gl.linkProgram` to query `gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS)` and `gl.getActiveUniform(prog, i)` to retrieve the exact uniform names, types, and locations used by Lusion's shaders.
   - **Cursor Trail Interaction Driving**:
     - Use `page.mouse.move(x, y, { steps })` in smooth multi-point bezier/lissajous paths with varied velocities to trigger the dynamic pointer velocity vectors in Lusion's GPGPU fluid/trail solver.
   - **ShadeR DSL Translation**:
     - Conforms strictly to `/skills/shader_dsl/SKILL.md`: stage isolation (`@compute`, `@vertex`, `@fragment`), IPO architecture (Input, Process, Output), and typed node definitions (pure vs stateful).

5. **Pseudo Code**
   ```shade
   Stage: @compute
   
   Input:
     - uTrailHistoryTexture: texture   # Ping-pong buffer containing past cursor coordinates & velocity
     - uPointerCurrent: vec2           # Normalized current mouse coordinate
     - uPointerPrev: vec2              # Previous mouse coordinate
     - uVelocity: vec2                 # Mouse delta / velocity vector
     - uDeltaTime: float               # Frame delta
     - uDissipation: float             # Exponential trail decay factor (e.g. 0.96)
   
   Process:
     - Node: Pointer Impulse Injector
       inputs:
         - pointerCurrent: vec2
         - pointerPrev: vec2
         - velocity: vec2
       outputs:
         - impulseForce: vec2
         - splatMask: float
       function: pure
       logic:
         Calculate signed distance from current UV to mouse segment (pointerPrev to pointerCurrent).
         Generate smooth gaussian impulse falloff splat weighted by velocity magnitude.
   
     - Node: Fluid Momentum Advection
       inputs:
         - previousVelocity: texture
         - impulseForce: vec2
         - dissipation: float
         - dt: float
       outputs:
         - updatedVelocity: vec2
       function: stateful
       logic:
         Sample previous frame velocity with semi-Lagrangian backtrace.
         Add splat impulse and apply exponential viscosity dissipation.
   
     - Node: Curl Noise Perturbation
       inputs:
         - uv: vec2
         - time: float
         - strength: float
       outputs:
         - curlVector: vec2
       function: pure
       logic:
         Calculate 2D curl of Simplex potential function to add organic turbulence to trail edges.
   
   Output:
     - nextTrailState: texture         # Ping-pong write buffer for velocity & density
   
   Stage: @fragment
   
   Input:
     - uTrailTexture: texture          # Computed velocity and density field
     - uSceneColor: texture            # Background / 3D geometry color buffer
     - uTime: float                    # Elapsed seconds
     - uResolution: vec2               # Canvas dimensions
   
   Process:
     - Node: Trail Distortion Sampler
       inputs:
         - uv: vec2
         - trailField: texture
         - distortionFactor: float
       outputs:
         - displacedUV: vec2
         - trailDensity: float
       function: pure
       logic:
         Sample trail texture velocity vector to offset screen UV coordinates.
         Extract density channel for glow and chromatic aberration.
   
     - Node: Chromatic Dispersion Mixer
       inputs:
         - displacedUV: vec2
         - baseTexture: texture
         - dispersionStrength: float
       outputs:
         - finalDistortedColor: vec4
       function: pure
       logic:
         Sample scene texture with R, G, B offsets along the trail displacement vector.
         Composite iridescent refraction highlight onto screen.
   
   Output:
     - gl_FragColor: vec4              # Rendered viewport output
   ```
