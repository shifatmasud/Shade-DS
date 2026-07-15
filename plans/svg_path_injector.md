# PRD: SVG Path Injector

## Overview
A Framer Code Component that "injects" path animations into a sibling SVG element using Framer Motion's `pathLength` capabilities.

## Objectives
- Discover a sibling SVG element in the Framer DOM.
- Animate its internal paths (drawing effect, dash offsets).
- Provide control over animation timing and trigger (mount, hover, scroll).

# OKR
- **Zero-Config**: Works by simply placing it next to an SVG in a Frame.
- **Visual Impact**: Smoothly animates complex SVG paths without requiring manual path modification in the code.

# ADR: SVG Animation Strategy

## 1. Path Preparation
SVG paths often lack `pathLength` metadata. We will use Framer Motion's `motion.path` logic by either:
- Wrapping the discovered path (difficult with direct DOM injection).
- Applying `stroke-dasharray` and `stroke-dashoffset` directly via style manipulation, mimicking Framer Motion's behavior.

## 2. Trigger System
- **Auto**: Animates immediately on discovery.
- **Hover**: Animates when the parent/shared-container is hovered.
- **Scroll**: Animates when the SVG enters the viewport.

# TODO
- [ ] Create `/Framer/SVGPathInjector.tsx`.
- [ ] Implement robust sibling SVG discovery.
- [ ] Implement path drawing logic (dasharray calculation).
- [ ] Add Framer Property Controls for customization.
