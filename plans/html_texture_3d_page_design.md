# Tech Spec: HTMLTexture 3D Full Page Design in Framer

1. **Objective**
   - Design a full, immersive 3D-interactive landing page in Framer utilizing the newly saved `HTMLTexture3D` component (`/framer/test/HTMLTexture3D.tsx`).
   - Seamlessly map live Framer DOM elements (such as rich text cards, interactive buttons, and bento grids) onto 3D RoundedBox geometries using Three.js `HTMLTexture`.

2. **Success Criteria**
   - Component correctly saved at `/framer/test/HTMLTexture3D.tsx`.
   - Full page layout designed with a hero section, bento feature grid, and interactive 3D card preview.
   - Smooth spring-based rotation and lighting configured via property controls.

3. **Project Requirements (Todo List)**
   - [x] Save `HTMLTexture3D.tsx` in `/framer/test/`.
   - [ ] Author Framer DSL instructions for full page layout (Hero, Bento Grid, HTMLTexture3D instance targeting "Card").
   - [ ] Validate session connection and apply changes to Framer project `y1l6dOERfhDA4a7hWZBS`.

4. **Architecture Decisions**
   - **Three.js & HTMLTexture**: Bridges DOM hierarchy directly into WebGL material maps without iframe overhead.
   - **RoundedBoxGeometry**: Provides smooth organic edge rounding for 3D cards.
   - **Framer Motion Integration**: Drives continuous spring-physics rotational updates.

5. **Pseudo Code (Framer DSL)**
   ```dsl
   +WebPageNode page3D name="3D Texture Showcase" path="/3d-texture";
   +FrameNode hero parent="page3D";
   SET hero layout="stack" stackDirection="vertical" width="100%" height="100vh" fill="#0A0A0F" stackAlignment="center" stackDistribution="center" gap=32;
   +ComponentInstanceNode 3dCard component="HTMLTexture3D" parent="hero";
   SET 3dCard target="Card" width=400 height=400 depth=150 radius=16 metalness=0.8 roughness=0.1;
   ```
