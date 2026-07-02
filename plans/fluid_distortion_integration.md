# Fluid Distortion Shader Integration Plan

## PRD (Product Requirements Document)
- **Overview & Objectives**: 
  We need to integrate a premium fluid advection and chromatic-dispersion distortion shader pipeline over the existing 3D scene in `/components/3D/scene.tsx`. This pipeline will:
  1. Capture the live 3D scene (including rapier physics, cubes, sky, and light reflections) into a WebGL Render Target (texture).
  2. Maintain a stateful fluid/paint simulation texture that evolves based on advection, diffusion/dissipation, and interactive user inputs (mouse/touch drags).
  3. Apply a blurring pass to diffuse the fluid state.
  4. Composite the final distorted 3D scene on the screen with chromatic dispersion, shimmer accents, and multi-tap blur/sampling, driven by the fluid simulation.
  
- **Visual & Interactive Objectives**:
  - The 3D scene must render perfectly into an FBO.
  - Interactive cursor drags or touch movements should "paint" velocity and density onto a simulation buffer.
  - The paint buffer must advect over time (fluid motion) and dissipate smoothly.
  - The final render should warp the 3D scene beautifully with color-splitting (chromatic aberration/dispersion) and a chromatic shimmer accent matching the fluid's velocity.

## OKR (Objectives and Key Results)
- **Objective 1**: Pristine visual execution of the paint fluid simulation and distortion effect.
  - *KR 1.1*: Fluid distortion warps the 3D blocks and floor cleanly based on mouse speed and direction.
  - *KR 1.2*: Chromatic dispersion split is visible and highly responsive.
  - *KR 1.3*: Smooth advection/dissipation with no flickering or rendering artifacts.
- **Objective 2**: Zero-regression performance and touch-interaction parity.
  - *KR 2.1*: Touch drags on mobile device screens trigger the fluid paint exactly like mouse clicks/hovers.
  - *KR 2.2*: FPS counter remains close to 60fps on standard desktop browsers.

## ADR (Architectural Design)
- **R3F Post-Processing Integration**:
  - We will disable R3F's automatic rendering of the Canvas to the screen by specifying a priority of `1` in `useFrame`:
    ```typescript
    useFrame((state) => { ... }, 1)
    ```
  - We will render the 3D scene into a main `THREE.WebGLRenderTarget` (`sceneTarget`) in every frame.
  - We will manage three additional render targets for the simulation:
    - `paintTarget1` & `paintTarget2` (ping-ponging for the advection simulation step).
    - `blurTarget` (for blurring the paint texture to create the low-resolution / diffused field `u_lowPaintTexture` used in the simulation).
  
- **Shader Pipeline Stages**:
  1. **Render Scene**: Render the active 3D `scene` and `camera` to `sceneTarget`.
  2. **Blur Pass**: Take `paintTarget1` (current state), run the blur shader (`BLUR_9_FRAG`), and render to `blurTarget`.
  3. **Simulation Pass**: Run `SCREEN_PAINT_FRAG` with `u_lowPaintTexture = blurTarget.texture`, `u_prevPaintTexture = paintTarget1.texture`, and mouse uniform parameters (`u_drawFrom`, `u_drawTo`, `u_vel`). Render to `paintTarget2`.
  4. **Ping-Pong Swap**: Swap `paintTarget1` and `paintTarget2` to advance the simulation state.
  5. **Compositing Pass**: Run `DISTORTION_COMPOSITOR_FRAG` using `sceneTarget.texture` as the input scene texture, and `paintTarget1.texture` as the screen paint texture. Render to the default screen framebuffer (canvas).

- **Interaction Tracking**:
  - Track pointer position in canvas-relative pixels.
  - Scale pointer coordinates to match the simulation texture resolution (e.g. 512x512).
  - Calculate cursor velocity vector and map it to `u_vel`.
  - Pass brush configuration (`radius`, `weight`) in `u_drawFrom` and `u_drawTo` `vec4` uniforms.

- **Fallback Safety**:
  - Auto-adjust targets on canvas resize to ensure crisp rendering at any resolution.
  - Properly dispose of all WebGL resources (`dispose()` for geometries, materials, render targets) on unmount to prevent GPU memory leaks.

## TODO List
1. [ ] Inspect existing `components/3D/scene.tsx` and identify the Canvas structure.
2. [ ] Extract the shaders code from the user request.
3. [ ] Design a dedicated R3F component `FluidDistortionEffect` that handles the entire pipeline.
4. [ ] Mount the `FluidDistortionEffect` inside the `<Canvas>` of `<Scene3D>`.
5. [ ] Wire mouse/pointer move listeners to update uniforms (`u_drawFrom`, `u_drawTo`, `u_vel`).
6. [ ] Implement touch event listeners to ensure high-quality interactive parity for touch/mobile devices (as per the `Interaction & Touch Parity` rules in `AGENTS.md`).
7. [ ] Verify compilation, linting, and inspect visual fidelity in development server.
