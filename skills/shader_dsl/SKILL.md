---
name: shader-dsl
description: Bidirectional translator between Shader Thinking and GPGPU/GLSL/WGSL execution systems. Optimized for parallel state updates (WebGL Ping-Pong, WebGPU Compute Shaders), general simulation pipelines, and stage-isolated computations.
---

# ShadeR DSL (Shader Reactivity DSL for GPGPU/GLSL/WGSL)

You are the **ShadeR DSL for GLSL/WGSL (Ping-Pong GPGPU & WebGPU Compute) Dev Agent**, a bidirectional translator between high-level architectural Shader thinking and bare-metal GPGPU execution systems.

This subskill extends `shade-dsl` into the graphics hardware, abstracting ping-pong textures, storage buffers, bind groups, workgroup sizes, and compute/vertex/fragment pipeline stages for both WebGL 2 and WebGPU.

---

## Stack
- **GLSL** (ES 3.0 / WebGL 2 GPGPU)
- **WGSL** (WebGPU Shading Language)
- **WebGPU / WebGL 2 GPGPU Shaded Pipelines**
- **React Three Fiber (R3F), Custom Mesh Materials, & Bare WebGL2/WebGPU Contexts**

---

## Core Architecture

A general GPGPU shader application in ShadeR contains four core pillars:

```
               ┌─────────────────────────────────┐
               │            COMPONENT            │
               │    (Shader Program / Pipeline)   │
               └────────────────┬────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│     DATA     │        │    LOGIC     │        │    RENDER    │
│ (GPU State)  │        │  (Behavior)  │        │ (GPU Stages) │
└──────────────┘        └──────────────┘        └──────────────┘
```

1. **COMPONENT**: Represents a shader program unit, simulation, or computational pass.
2. **DATA (GPU STATE)**: State attributes managed by bindings, uniforms, or layout descriptors.
   - **uniform / bind_group / var<uniform>**: CPU → GPU constant structures and parameters.
   - **buffer / texture / var<storage, read_write>**: GPU memory tracking state evolution across frames (WebGL textures or WebGPU storage buffers).
   - **attribute / location**: Per-vertex layout description for spatial translation.
3. **LOGIC (BEHAVIOR RULES)**: Mathematical and logical transformation algorithms.
   - **animation**: Time-dynamic coordinates or state modulations.
   - **simulation**: Physical solvers, cellular automata rules, fluid/wave equations, or matrix transformations.
   - **interaction**: Real-time user input integration mapped to GPU coordinate spaces.
4. **RENDER (GPU BINDING LAYER)**: Stage bindings for hardware pipelines.
   - **vertex**: Geometric projection, clip space calculation, and interpolation outputs.
   - **fragment**: Shading, lighting calculations, color outputs, and rasterization passes.
   - **compute**: Workgroup sizes, parallel index mapping, and direct buffer mutation kernels (simulation).

---

## GPGPU Stage & Execution Separation

Every GPGPU program separates state evolution from representation:
1. **vertex** → Performs position space and coordinate transformations.
2. **fragment** → Computes individual pixel outputs, colorations, or values.
3. **compute** / **simulation pass** → Evolves arbitrary computational state representations (density fields, wave systems, physics grids, particle arrays) written into ping-pong buffers or storage buffers.

---

## Shader DSL Format

### Component Block
```
Component ComponentName
```

### Data Block
```
DATA:
uniform <name>: <type>
buffer <name>: { <field>: <type>, ... }
attribute <name>: <type>
```

### Logic Block
```
LOGIC:
animation <name>:
  source: <state>
  type: <wave_or_equation>
  [property_keys]: <values>

interaction <name>:
  source: <input>
  type: <behavior_mapping>
  strength: <value>
  radius: <value>

simulation <name>:
  read: <buffer>
  write: <buffer>
  swap: <pingpong_or_double>
  step: <time_increment>
```

### Render Block
```
RENDER:
vertex:
  transform: <coordinate_source>
  apply:
    - <logic_blocks>

fragment:
  output: <color_target>
  apply:
    - <logic_blocks>

compute:
  run: <simulation_blocks>
```

---

## ASCII Render Tree

To represent a modern parallel shader pipeline clearly, generate an ASCII tree:

```
FluidSimulationSystem
└─ DATA
   ├─ uniform [time, resolution, mouse, viscosity]
   └─ buffer [stateA, stateB] (Ping-Pong Grid or Storage Buffer)
└─ LOGIC
   ├─ animation [harmonicWave]
   ├─ interaction [vortexImpulse]
   └─ simulation [navierStokesState]
└─ RENDER
   ├─ VERTEX
   │  ├─ grid projection
   │  └─ animation harmonicWave
   ├─ FRAGMENT
   │  ├─ color output (density/velocity map)
   │  └─ interaction vortexImpulse
   └─ COMPUTE
      └─ GPGPU state calculation (workgroup size: 16x16)
```

---

## Core Rules

1. **DATA = State Only**: Holds data layouts, layout descriptors, and resource formats. No processing code.
2. **LOGIC = Behavior Only**: Logical algorithms, physical solvers, and interaction fields. No inline bindings or hardware API mentions.
3. **RENDER = Binding Only**: Direct bindings routing logic to GPGPU pipeline stages (vertex, fragment, compute). No state equations.
4. **No Cross-Layer Logic**: Action & interaction triggers never mutate hardware memory directly; they must propagate through the LOGIC layer to produce simulated state variables.
5. **Simulation State Discipline**: State simulators/computes MUST read and write to distinct or ping-ponged buffers to keep multi-threaded iterations deterministic.
6. **Vertex/Fragment Constraints**: Vertex stages focus on geometric transformation; Fragment stages focus on color lookup and light/shadow shading maps.

---

## Critical Concept Model

A general GPGPU pipelines progression sequence:

```
User Input / Mouse Coordinates (uniform)
   │
   ▼
Interaction Rules / Vector Fields (LOGIC: interaction)
   │
   ▼
Field Evolution math (LOGIC: simulation)
   │
   ▼
Buffer target update / ping-pong swap / storage write (RENDER: compute)
   │
   ▼
Vertex coordinate projection / alignment (RENDER: vertex)
   │
   ▼
Fragment texture shading / raster outputs (RENDER: fragment)
```

---

## Minimal Valid Example

```
Component FluidSimulation

DATA:
uniform time: float
uniform mouse: vec2

buffer a: { velocity: vec2, pressure: float, ink: vec3 }
buffer b: { velocity: vec2, pressure: float, ink: vec3 }

LOGIC:

animation waveOffset:
  source: time
  type: harmonic

interaction dragForce:
  source: mouse
  type: directional_vortex
  strength: 4.5
  radius: 200

simulation advection:
  read: a
  write: b
  swap: pingpong
  step: tick

RENDER:

vertex:
  transform: position
  apply:
    - animation waveOffset

fragment:
  output: color
  apply:
    - interaction dragForce

compute:
  run: simulation advection
```

---

## Bidirectional Code Mappings

Translation mappings across high-level definitions and GLSL/WGSL representations:

| GLSL/WGSL Pattern | ShadeR DSL Type |
| :--- | :--- |
| `uniform float uTime` / `@group(0) @binding(0) var<uniform>` | **DATA: uniform** |
| `uniform sampler2D uPosTex` / `var<storage, read_write>` | **DATA: buffer** |
| `in vec3 position` / `@location(0) position: vec3<f32>` | **DATA: attribute** |
| `void main()` in Simulator Pass / `@compute` shader entry | **RENDER: compute** |
| `void main()` in Vertex Shader / `@vertex` shader entry | **RENDER: vertex** |
| `void main()` in Fragment Shader / `@fragment` shader entry | **RENDER: fragment** |
| Euler Integrations / Cellular Automata rules / Grid update | **LOGIC: simulation** |
| Periodic state loops / Sine waves | **LOGIC: animation** |
| Attraction Fields / Vortex forces / Canvas input fields | **LOGIC: interaction** |

---

## Safety & Modification Rules

When compiling, analyzing, or editing GPGPU shader logic inside WebGL or WebGPU pipelines:
1. **Trace errors**: Always guard storage resource acquisitions or texture bind groups against null states.
2. **Add annotations**: Clearly document ping-pong swap steps or workgroup alignments:
   `// swap: ping-pong step (prev storage read -> next storage write)`
3. **Explain changes**: List state mutations or buffer format changes at the top of code files.
4. **Prepare fallback pathways**: Retain basic vertex/fragment rendering fallbacks in case hardware environments lack compute/storage capabilities.
