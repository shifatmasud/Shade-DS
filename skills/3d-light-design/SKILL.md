---
skill: 3d-light-design
version: 1.0.0
purpose: Design physically-plausible, intentional 3D lighting setups by reasoning from scene goals.
applies_to: all agents
trigger:
  - 3d lighting
  - three.js lighting
  - react-three-fiber lighting
  - light placement
  - shadow settings
---

# 3D Light Design

## Core Rule
Never place lights randomly. Every light must serve a clear purpose and improve visibility, shape, depth, focus, mood, realism, or composition. If it improves none, remove it.

---

## Lighting Strategy by Scene Type

### 1. Natural Scene (Simulate Real-World)
*   **Environment Map** (Sky/Ambient): Global bounce, reflections, prevents black shadows.
*   **Directional Light** (Sun/Moon): Primary highlights, readable shadows, form.
*   *Avoid*: Generic ambient lights (washes out contrast).

### 2. Cinematic Scene (Guide Attention)
*   **Key Light**: Primary storytelling light. Placed 30–45° and slightly above subject.
*   **Fill Light**: Controls shadow contrast. Placed opposite to key, lower intensity.
*   **Rim Light**: Behind subject to separate it from the background with bright edges.
*   *Optional*: Practical lights (lamps, monitors), background lights.

### 3. Product Lighting (Reveal Materials)
*   Large soft Key &rarr; Soft Fill &rarr; Rim &rarr; Subtle HDRI. Large sources yield attractive reflections.

### 4. Interior / Exterior Scenes
*   **Interior**: HDRI/Environment + Window (Area/Directional) + Practicals.
*   **Exterior**: Directional (Sun) + Environment Map + Fog (optional, adds depth).

---

## Light Selection Quick Guide

| Light Type | Best Used For | Avoid For |
| :--- | :--- | :--- |
| **Directional** | Sun, Moon (infinite rays) | Indoor bulbs / small localized fixtures |
| **Area** | Windows, softboxes, large screens | Tiny sharp spotlights |
| **Spot** | Flashlights, stage beams, tight accents | General background filling |
| **Point** | Bulbs, candles, localized omni-emitters | Large outdoor ambient sky |
| **Environment** | Sky reflections, ambient global bounce | High-contrast shadow casting |

---

## Decision Framework & Output Format
For every light added, document the following concise details:

### [Light Name / Type]
*   **Purpose**: Why does it exist and what visual problem does it solve?
*   **Settings**: Placement (XYZ), Rotation, Intensity, Color, Shadows (bias, map size).
*   **Reasoning**: Why this specific type and position? Why can't another light replace it?
*   **Expected Result**: What is the visual outcome?

---

## Optimization Rules
1.  **Less is More**: Prefer few lights with high visual impact. Avoid many weak lights.
2.  **Motivated Lighting**: Ensure lights correspond to visual sources (windows, lamps, screens).
3.  **Performance**: Enable shadows only on crucial lights. Keep shadow map resolution optimized.
