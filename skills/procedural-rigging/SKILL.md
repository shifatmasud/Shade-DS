---
name: procedural-rigging
description: Bidirectional translator between biomechanical models and procedural animation state engines. Governs constrained point chains, body shaping, kinematics solvers (FK, FABRIK), and foot step triggers for zero-rerender organic rigging.
---

# Procedural Rigging DSL & Animation System

You are the **Procedural Animation & Biomechanical Rigging Dev Agent**, specializing in creating organic movement systems using light math, constraint solvers, and kinematics. You bypass bulky physics engines to build ultra-responsive 2D/3D creatures, ropes, aquatic animals, and multi-legged walkers.

---

## Core Concepts & Mechanics

### 1. Distance Constraints (Stretched Point Verification)
- **Mechanism:** Each child point $p_i$ is placed at a distance $d$ from its parent anchor $p_{i-1}$.
- **Solver:** Let $\vec{v} = p_i - p_{i-1}$ be the current offset vector. Normalize $\vec{v}$ and scale it by the fixed segment length $L$:
  $$p_i = p_{i-1} + L \cdot \frac{\vec{v}}{\|\vec{v}\|}$$
- **Applications:** Tail, backbone, spine elements, tentacles, loose cords.

### 2. Chained Constraints (Trailing Follow Engine)
- **Mechanism:** Connect several distance constraints in series: $p_0 \rightarrow p_1 \rightarrow p_2 \rightarrow \dots \rightarrow p_n$.
- **Behavior:** The lead anchor $p_0$ moves (e.g., guided by mouse or autonomous steering), and each subsequent node solves its distance constraint relative to its predecessor, creating a gorgeous trailing chain.
- **Applications:** Snake slithering, swimming eels, rope dragging.

### 3. Body Shaping & Parametric Geometry
- **Mechanism:** Turn the skeletal point chain into a rendered mesh by defining width/radius offsets normal to each segment's direction vector.
- **Algorithm:** For a segment path pointing from $p_{i-1}$ to $p_i$:
  1. Compute tangent $\vec{t} = \text{normalize}(p_i - p_{i-1})$.
  2. Derive normal $\vec{n} = \begin{bmatrix} -t_y \\ t_x \end{bmatrix}$.
  3. Define width $W_i = \text{width\_function}(i / N)$ where $N$ is the chain length.
  4. Generate left and right body vertices:
     $$v_{\text{left}, i} = p_i + \vec{n} \cdot W_i$$
     $$v_{\text{right}, i} = p_i - \vec{n} \cdot W_i$$
- **Applications:** Detailed fish shapes, tapering tentacles, bulging muscles, creature silhouettes.

### 4. Angle Constraints (Joint Rotation Limits)
- **Mechanism:** Prevents realistic vertebrae from bending past organic limits (protects against self-overlapping & skeletal breaking).
- **Solver:** For segments $A = p_i - p_{i-1}$ and $B = p_{i+1} - p_i$:
  1. Calculate current angles relative to each other: $\theta = \text{atan2}(B_y, B_x) - \text{atan2}(A_y, A_x)$.
  2. Clamp $\theta$ within $[-\theta_{\max}, \theta_{\max}]$.
  3. Recompute $p_{i+1}$ position using the clamped absolute heading.

### 5. Kinematic Solvers

#### Forward Kinematics (FK)
- **Mechanism:** Top-down angle accumulation.
- **Rotation Rule:** $Angle_i = Angle_{\text{parent}} + \Delta\theta_i$.
- **Position Rule:** $p_i = p_{i-1} + \mathbf{R}(Angle_i) \cdot \vec{L}_i$.

#### Inverse Kinematics (IK) — FABRIK (Forward And Backward Reaching Inverse Kinematics)
- **Mechanism:** Rapid double-pass correction loop:
  - **Backward Pass:** Target the tail node $p_n$ exactly to target position $T$. Move $p_{n-1}$ along the vector to $p_n$ at length $L_{n-1}$. Continue up to the origin $p_0$.
  - **Forward Pass:** Reset the origin point $p_0$ to its fixed base anchor $A$. Project segments forwards back toward $p_n$ to restore correct segment lengths.
  - **Convergence:** Run for $k$ iterations (typically 2–4 is plenty for sub-pixel accuracy) or until terminal margin is crossed.
- **Applications:** Legs finding foot placement targets during walk cycles, responsive grabbing arms, target-sensing tentacles.

### 6. Procedural Walking & Foot Placement Rules
- **Step Triggering:**
  - Track each foot's current location $F_i$ and its respective default resting target $T_i$ (derived from body position and velocity vector).
  - When the distance $\|F_i - T_i\| > \text{StepThreshold}$, trigger a step.
- **Limb Lock & Gait Coordination:**
  - Alternating Leg Locks: Ensure adjacent legs do not take steps at the same exact time (maintains balance, avoids "floating" bodies).
- **Leg Swing Path (Framer Motion / Lerp):**
  - Interpolate foot coordinates smoothly using a high parabolic arc:
    $$F_x(t) = \text{lerp}(F_{\text{start}, x}, T_x, t)$$
    $$F_y(t) = \text{lerp}(F_{\text{start}, y}, T_y, t) - H_{\max} \cdot 4 \cdot t(1 - t)$$

---

## Biomechanical DSL Representation

### Creeping Worm
```yaml
Rig: SimpleWorm
type: Chain
segments: 12
segmentLength: 20

Data:
  target: vec2 # Follow focus (e.g., cursor coordinate)
  positions: Array<vec2> # Skeletal spine points
  widths: Array<number> # Parametric tapering curve

Logic:
  - Solver: DistanceConstraint + AngleConstraint(45_deg)
  - MotionDriver: Heading direction towards Target with noise drift
  - Geometry: Offset left/right vertices using spine tangents & sine pulse

Render:
  - Draw: SVGMesh with color-gradient fill
  - Features: Duo eyes locked on leading segment rotation [0]
```

### Hexapod Walker
```yaml
Rig: Insectoid
type: MultiLimb
spineSegments: 3
limbs: 6

Data:
  chassis: RigidSpine
  feet: Array<{ current: vec2, target: vec2, stepping: boolean }>
  gait: AlternatingTripod

Logic:
  - ChassisMovement: Drag backbone to target, align headings
  - LegSolver: FABRIK solver (2 segments: femur, tibia) targeting GroundPosition
  - Trigger: Step when feet drift beyond 40px of chassis projection

Render:
  - Draw: SVGMesh for chassis and joint-to-joint paths for legs
```

---

## Reference Implementations (TypeScript)

### 1. Simple Dynamic Chain & Follow Logic
```typescript
interface Point {
  x: number;
  y: number;
}

export function solveChain(
  points: Point[], 
  targetX: number, 
  targetY: number, 
  segmentLength: number
): Point[] {
  const result = [...points];
  
  // Set the head position to target
  result[0] = { x: targetX, y: targetY };
  
  // Apply distance constraints sequentially down the spine
  for (let i = 1; i < result.length; i++) {
    const parent = result[i - 1];
    const current = result[i];
    
    const dx = current.x - parent.x;
    const dy = current.y - parent.y;
    const distance = Math.hypot(dx, dy) || 0.001;
    
    // Slide current element to exact radius L from target
    const factor = segmentLength / distance;
    result[i] = {
      x: parent.x + dx * factor,
      y: parent.y + dy * factor
    };
  }
  
  return result;
}
```

### 2. FABRIK Solver (2D)
```typescript
export function solveFABRIK(
  joints: Point[],
  target: Point,
  base: Point,
  lengths: number[],
  tolerance: number = 0.5,
  maxIterations: number = 10
): Point[] {
  const result = joints.map(j => ({ ...j }));
  const n = result.length;
  
  // Check if target is out of reach
  const totalLength = lengths.reduce((a, b) => a + b, 0);
  const dx = target.x - base.x;
  const dy = target.y - base.y;
  if (Math.hypot(dx, dy) > totalLength) {
    // Extend fully toward target
    let angle = Math.atan2(dy, dx);
    for (let i = 1; i < n; i++) {
      result[i] = {
        x: result[i - 1].x + Math.cos(angle) * lengths[i - 1],
        y: result[i - 1].y + Math.sin(angle) * lengths[i - 1]
      };
    }
    return result;
  }
  
  // Within reach: Iterative double-pass logic
  for (let iter = 0; iter < maxIterations; iter++) {
    // Check if close enough
    if (Math.hypot(result[n - 1].x - target.x, result[n - 1].y - target.y) < tolerance) {
      break;
    }
    
    // BACKWARD PASS: Target tail node to target
    result[n - 1] = { ...target };
    for (let i = n - 2; i >= 0; i--) {
      const next = result[i + 1];
      const cur = result[i];
      const stepDx = cur.x - next.x;
      const stepDy = cur.y - next.y;
      const dist = Math.hypot(stepDx, stepDy) || 0.001;
      const factor = lengths[i] / dist;
      result[i] = {
        x: next.x + stepDx * factor,
        y: next.y + stepDy * factor
      };
    }
    
    // FORWARD PASS: Base head node back to anchor base
    result[0] = { ...base };
    for (let i = 1; i < n; i++) {
      const prev = result[i - 1];
      const cur = result[i];
      const stepDx = cur.x - prev.x;
      const stepDy = cur.y - prev.y;
      const dist = Math.hypot(stepDx, stepDy) || 0.001;
      const factor = lengths[i - 1] / dist;
      result[i] = {
        x: prev.x + stepDx * factor,
        y: prev.y + stepDy * factor
      };
    }
  }
  
  return result;
}
```

---

## Architectural Rules for Rigging UI

1. **Responsive Target Tracking:** Use cursor pointers, touch dragging coordinates, or cyclical sine sweeps as head targets.
2. **Springy Mass Emulation:** Combine kinematic results with minor lerp-smoothing coefficients to give organic meat-like weight without requiring massive CPU calculations.
3. **Optimized Draw Cycles:** Always perform rendering inside a `useFrame`-style microloop or single-Canvas drawing context to prevent React reconciler overflows.
4. **Interactive Controls:** Provide users with real-time tuning rods: segment length, tapering shape sliders, joints count, steps frequency parameters to make the biomechanical models a joy to tweak. Every animation should respond instantly.

---

<!-- 
SAFETY & MODIFICATION LEDGER:
- Original Created: Added Procedural Animation and Biomechanical Rigging system skills.
- Rules Set: Multi-pass FABRIK mechanics, parametric body offsets vector normal computations, alternating walk cycles, and full TypeScript implementation patterns for Worm/Chain and Legs.
-->
