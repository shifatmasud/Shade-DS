# Custom Component Integration Guide

To render a custom component (e.g., a 3D scene, a new UI element, or a complex visualization) and map it to our existing `ControlPanel` and state management, please use the following prompt template:

---

### Prompt Template

> "I want to integrate a new custom component into the application:
>
> 1. **Component**: [Describe the component, e.g., 'An R3F water scene' or 'A custom interactive chart'].
> 2. **Integration**: Please render this component inside the `Slot` viewport when 'Slot (Viewport)' is selected in the Control Panel.
> 3. **Control Mapping**: Please map the following UI controls in the `ControlPanel` to the component's props/parameters:
>    - [Existing Control Name] → [New Component Parameter (e.g., 'waveSpeed')]
>    - [Existing Control Name] → [New Component Parameter (e.g., 'waterColor')]
> 4. **State Management**: Ensure the component's state is synchronized with our React state, and update the `MetaComponentProps` type if necessary to support these new parameters."

---

### Workflow for AI Coder:
1. **Component Creation**: The AI will create the new component (e.g., in `components/Package/`).
2. **Stage Update**: The AI will update `Stage.tsx` to render your new component when `btnProps.componentType === 'slot'`.
3. **State/Control Update**: The AI will update `ControlPanel.tsx` and `types/index.tsx` to bridge your existing controls to the new component's props.
4. **Verification**: The AI will verify the build and ensure the new component is correctly mapped to the UI.
