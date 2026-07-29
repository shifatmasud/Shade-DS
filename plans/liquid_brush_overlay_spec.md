# Tech Spec

1. **Objective**
   - **Problem Statement**: The current fluid trail distorts the background scene outside of the liquid boundary, lacks a cohesive convex magnification effect inside the trail, lacks organic brush path waviness, and dissipates uniformly rather than contracting and beading up inward over time as a low-viscosity liquid droplet stream.
   - **Solution Overview**: Restructure the fluid distortion display and simulation shaders into a strict overlay liquid lens model. The 3D background scene remains 100% stable outside the liquid mask. Inside the liquid stream, a smooth convex dome normal is derived from the density gradient to create a realistic magnifying lens distortion (refraction offset inward/outward creating convex magnification). Introduce subtle sinusoidal wave modulation to pointer trajectories for organic brush motion, apply low-viscosity fluid advection, and implement surface tension inward contraction (beading up along density gradients during dissipation).
   - **Scope**: Modify `FluidDistortion.tsx` simulation, advection/dissipation pass, splat positioning, and final post-processing display shaders.
   - **Context**: Component hierarchy in `/components/staged/3D/FluidDistortion.tsx`.

2. **Success Criteria**
   - **Non-Negotiable 1**: Zero distortion outside the liquid mask; 3D background scene acts as a crystal-clear stable glass plate.
   - **Non-Negotiable 2**: Convex magnification lens effect *only* inside the fluid trail (magnifying and bulging the background scene underlying the liquid droplet stream).
   - **Non-Negotiable 3**: Single continuous fluid trail with subtle wavy brush motion along pointer movement.
   - **Non-Negotiable 4**: Inward surface tension contraction & beading up behavior as fluid dissipates (density gradient pulls liquid inward rather than fading uniformly).
   - **Non-Negotiable 5**: Low-viscosity fluid dynamics (responsive flow, smooth wave propagation, higher mobility).

3. **Project Requirements**
   - [ ] Add subtle wave displacement math (`sin`/`cos` perpendicular offset along mouse motion vector) in stroke splatting.
   - [ ] Isolate background sampling: mask background sampling strictly to `mask > 0.0`. Where `mask == 0.0`, sample `inputBuffer` at exact unmodified `uv`.
   - [ ] Calculate convex dome normals using density height map `n = normalize(vec3(-dDensity/dx, -dDensity/dy, heightFactor))` inside liquid trail.
   - [ ] Compute optical refraction vector using convex normal to achieve realistic magnification/bulging of the background objects behind the liquid trail.
   - [ ] Enhance dissipation pass with surface-tension contraction vector: `uv_advect += density_gradient * surfaceTensionStrength * (1.0 - density)`.
   - [ ] Tune low-viscosity parameters (velocity retention, curl frequency, low resistance advection).

4. **Architecture Decisions**
   - **Convex Lens Dome Normal vs Velocity Refraction**:
     - *Alternative*: Refracting background strictly using velocity vector (causes unnatural shearing and distorts background when fluid moves fast).
     - *Decision*: Derive pseudo-3D surface normal from fluid density map (`density` treated as liquid droplet height). This yields a true spherical/convex lens profile where light refracts inward toward the center of the liquid drop, creating a convex magnifying glass effect independent of background distortion.
   - **Zero Scene Distortion Guarantee**:
     - *Decision*: In the display shader, `float mask = smoothstep(0.02, 0.2, tapDensity)`. The UV refraction offset is multiplied by `mask`. Furthermore, `mix(unmodifiedColor, refractedColor, mask)` guarantees zero distortion for any pixel outside the liquid path.
   - **Surface Tension Inward Contracting Dissipation**:
     - *Decision*: In the advection/dissipation pass, subtract a fraction of the spatial density gradient. High density pulls surrounding low density inward, causing the liquid trail edges to pull inward and bead up as it dissipates.

5. **Pseudo Code**

```shader
// ShadeR DSL: Liquid Lens & Surface Tension Contractive Dissipation Shader

// --- SPLAT PASS: Wavy Brush Trajectory ---
@stage(splat)
fn generateWavySplat(uv: vec2, posA: vec2, posB: vec2, time: float) -> vec4 {
    vec2 dir = posB - posA;
    float len = length(dir);
    vec2 perp = vec2(-dir.y, dir.x) / max(len, 0.001);
    
    // Subtle sinusoidal wave along stroke perpendicular
    float wavePhase = len * 12.0 + time * 6.0;
    vec2 wavyOffset = perp * sin(wavePhase) * 0.008;
    
    vec2 wavyA = posA + wavyOffset;
    vec2 wavyB = posB + wavyOffset;
    
    float dist = sdSegment(uv, wavyA, wavyB);
    float strokeDensity = smoothstep(radius, radius * 0.2, dist);
    return vec4(dir * strokeDensity, strokeDensity, 1.0);
}

// --- ADVECTION & DISSIPATION PASS: Inward Surface Tension Contraction ---
@stage(advect_dissipate)
fn contractiveDissipation(uv: vec2, tLowRes: sampler2D, dt: float) -> vec4 {
    vec4 state = texture2D(tLowRes, uv);
    vec2 vel = (state.rg - 0.5) * 2.0;
    float density = state.b;
    
    // Surface tension inward pull along density gradient
    float dX = texture2D(tLowRes, uv + vec2(0.01, 0.0)).b - texture2D(tLowRes, uv - vec2(0.01, 0.0)).b;
    float dY = texture2D(tLowRes, uv + vec2(0.0, 0.01)).b - texture2D(tLowRes, uv - vec2(0.0, 0.01)).b;
    vec2 surfaceTension = vec2(dX, dY) * 0.03 * (1.0 - density);
    
    // Advect UV backward with surface tension contraction
    vec2 uvAdvect = uv - (vel * 0.005 + surfaceTension) * dt;
    vec4 newState = texture2D(tLowRes, uvAdvect);
    
    // Dissipate density while preserving core cohesion (beading up)
    newState.b *= 0.965;
    return newState;
}

// --- DISPLAY PASS: Convex Liquid Lens Refraction Overlay ---
@stage(fragment)
fn liquidConvexLensDisplay(uv: vec2, tFluid: sampler2D, sceneBuffer: sampler2D) -> vec4 {
    vec4 fluid = texture2D(tFluid, uv);
    float density = fluid.b;
    
    // Liquid mask (0.0 outside trail, 1.0 inside core)
    float mask = smoothstep(0.05, 0.35, density);
    
    if (mask <= 0.001) {
        // Stable Glass Guarantee: 100% clean, undistorted background scene
        return texture2D(sceneBuffer, uv);
    }
    
    // Calculate 3D surface normal of liquid droplet dome (convex profile)
    float eps = 0.006;
    float dX = texture2D(tFluid, uv + vec2(eps, 0.0)).b - texture2D(tFluid, uv - vec2(eps, 0.0)).b;
    float dY = texture2D(tFluid, uv + vec2(0.0, eps)).b - texture2D(tFluid, uv - vec2(0.0, eps)).b;
    
    // Normal vector pointing outward from dome center
    vec3 normal = normalize(vec3(-dX * 4.0, -dY * 4.0, 1.0));
    
    // Convex Lens Refraction Offset (Magnifies/Bulges underlying 3D scene)
    vec2 refractionOffset = normal.xy * 0.045 * mask;
    
    // Sample background with lens displacement & chromatic dispersion
    vec3 sceneColor;
    sceneColor.r = texture2D(sceneBuffer, uv - refractionOffset * 1.08).r;
    sceneColor.g = texture2D(sceneBuffer, uv - refractionOffset * 1.00).g;
    sceneColor.b = texture2D(sceneBuffer, uv - refractionOffset * 0.92).b;
    
    // Specular highlight on liquid droplet edge
    vec3 lightDir = normalize(vec3(0.5, 0.8, 1.0));
    float spec = pow(max(dot(normal, lightDir), 0.0), 16.0) * 0.25 * mask;
    
    // Blend clean scene with convex liquid lens overlay
    vec3 baseScene = texture2D(sceneBuffer, uv).rgb;
    vec3 finalColor = mix(baseScene, sceneColor + vec3(spec), mask);
    
    return vec4(finalColor, 1.0);
}
```
