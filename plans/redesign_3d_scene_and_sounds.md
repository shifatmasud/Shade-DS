# Plan: Redesign 3D Scene and Sounds

## 1. PRD (Overview & Objectives)
- **Objective**: Redesign the visual rendering of the 3D sandbox scene to look highly premium, glassy, and professional, and craft dedicated realistic "jelly" sound synthesis profiles.
- **Scope**:
  - **Visual Redesign**:
    - Change the floor from a flat, matte grey box to a dark, ultra-glossy, reflective obsidian-like surface using a `MeshPhysicalMaterial` (with high clearcoat, low roughness, and subtle transparency).
    - Inject a soft, high-tech grid layer (`gridHelper`) floating slightly above the floor for an elegant architectural preview style.
    - Implement a professional three-point studio lighting rig, adding secondary soft-colored accent lights (teal and warm pink/magenta) to cast beautiful specular and refractive highlights on the jelly cubes.
  - **Audio Redesign**:
    - Create four new specialized audio synthesis recipes in `/services/soundService.ts`:
      - `jelly_impact`: A soft, wet, multi-layered thud. Combines a low-frequency sine thump with a mid-frequency resonant wobble and a filtered bandpass noise pop.
      - `jelly_spawn`: A playful, fast-rising bubble pop sound played upon spawning a cube.
      - `jelly_grab`: A fast, suction-like downward swoop with a soft high-frequency friction sizzle for pickup.
      - `jelly_release`: A gentle, soft-landing low-mid sine swoop for letting go.
    - Wire these sounds into the 3D scene: spawn action plays `jelly_spawn`, drag starts play `jelly_grab`, drag ends play `jelly_release`, and collisions use the updated `jelly_impact`.
  - **Modal Button Refactoring**:
    - Redesign the circular "Info" (Instructions Modal) trigger button at the top-right of the 3D scene.
    - Transition its style from a flat opaque background to a matching glassmorphic/glasslike styling used by the "Spawn Jelly Cube" button (high-blur backdrop filter, translucent border, and subtle white overlay).

## 2. OKR (Success Criteria)
- **Key Result 1**: The instructions modal trigger button looks perfectly aligned, glasslike, and matches the spawn button style.
- **Key Result 2**: The 3D scene visual presentation is enhanced with reflective ground surfaces, technical grid alignments, and rich dual-tone studio point lighting.
- **Key Result 3**: All audio events (spawn, grab, letgo, impact) trigger high-quality, synthesized "jelly-like" sound effects generated in real-time by the pure Web Audio engine.
- **Key Result 4**: Zero build errors, syntax issues, or performance regressions occur.

## 3. ADR (Architectural Design)
- **State Integration**: Use the pre-existing `playSound` architecture in `/services/soundService.ts` without introducing heavy external assets or libraries (adhering to pure Web Audio synthesis).
- **Visual Materials**: Optimize the glossy reflective material on the floor by carefully balancing the `clearcoat`, `roughness`, and color parameters of `MeshPhysicalMaterial` to ensure high-performance rendering on both mobile and desktop.
- **Button Styling**: Extract common glassmorphic CSS property sets to ensure visual parity. Apply standard Framer Motion scale animations (`whileHover`, `whileTap`) to preserve physical interactive responsiveness.

## 4. TODO List
- [ ] Create the architectural plan (Completed).
- [ ] Edit `/services/soundService.ts` to add the new synthesis recipes (`jelly_impact`, `jelly_spawn`, `jelly_grab`, `jelly_release`) and map events appropriately in `resolveSoundName`.
- [ ] Edit `/components/3D/scene.tsx`:
  - [ ] Add `gridHelper` and upgrade the Floor mesh to use `MeshPhysicalMaterial` with glassy obsidian properties.
  - [ ] Upgrade the lighting system by reducing ambient light slightly and adding two dual-colored accent lights (Teal/Cyan at [-5, 5, -5] and Pink/Magenta at [5, 3, 5]) for breathtaking refractions.
  - [ ] Wire up `playSound` triggers for Spawning (`spawn`), Drag Start (`grab`), and Drag End (`letgo`).
  - [ ] Redesign the top-right `Info` modal trigger button to match the `buttonStyle` (glasslike).
- [ ] Run compiler and linter tools (`compile_applet`, `lint_applet`) to verify changes.
- [ ] Present a clean, scannable summary of the crafted elements to the user.
