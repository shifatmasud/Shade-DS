# Plan: Dual API Tradeoffs for Staged Components

## PRD (Product Requirements Document)

### Overview
This plan evaluates the integration of the **Dual API Components** skill into the existing **staged** component architecture. Staged components are specialized UI elements used within the interactive viewport of the Shade DSL system.

### Objectives
- Review the technical feasibility of dual-API (React Props + HTML API) synchronization.
- Identify architectural conflicts with the current `shade-dsl` and `motion` patterns.
- List concrete tradeoffs (Pros/Cons) for the development team.

---

## OKR (Objectives and Key Results)

### Success Criteria
1. **Architectural Clarity**: Defined how React state and DOM attributes/properties stay in sync.
2. **Tradeoff Matrix**: A clear table of pros and cons across Performance, DX, and Runtime.
3. **Implementation Prototype Logic**: A conceptual sketch of the "Sync Bridge".

---

## ADR (Architectural Design Record)

### Current Architecture
- **React-Centric**: Components rely on standard props and `MotionValue`s.
- **Motion Optimized**: Heavy use of `framer-motion` for zero-rerender updates.
- **Shade DSL**: Bidirectional translation between logic and view.

### Proposed Architecture Change
- **Custom Elements or Attribute Sync**: Each component will register itself or use a `useEffect` bridge to listen for attribute changes.
- **Property Exposure**: Using `useImperativeHandle` to attach properties directly to the DOM node.
- **Type Conversion**: A centralized helper to parse `string` attributes into `number`, `boolean`, or `JSON`.

---

## TODO List

1. [ ] **Analyze Synchronization Logic**: How to avoid feedback loops between Prop updates and Attribute updates.
2. [ ] **Performance Audit**: Impact of `AttributeChangedCallback` or `MutationObserver` on high-frequency components like `FillSlider`.
3. [ ] **Type Safety Review**: How to maintain TypeScript types while exposing raw DOM properties.
4. [ ] **Final Tradeoff List**: Consolidate findings.
