# Tech Spec

1. **Objective**
   - **Problem Statement**: Staged components in the editor (`Button`, `Card`, `FillSlider`, `NameTag`, `Slot`, `Custom`) share a single, monolithic props state (`MetaButtonProps`) and generic control panel options. This makes property controls redundant or mismatched for non-button types and produces a generic JSON output in the Code Panel that does not reflect each component's unique configuration and API.
   - **Solution Overview**: Diversify both the Property Controls (`ControlPanel.tsx`) and the JSON Configuration & React Usage previews (`CodePanel.tsx` / `Home.tsx` states) dynamically based on the active `componentType`.
   - **Scope**:
     - Implement dedicated, unique schemas of state/properties for each component.
     - Build component-specific sections and inputs inside `ControlPanel.tsx` (e.g., body text, media height for `Card`; min, max, step, show value for `FillSlider`; header text, name, subtitle, level for `NameTag`; speed, scale, physics mode for `Slot`).
     - Generate clean, customized config JSON in the Code Panel representing only the relevant options for each component type.
     - Format the React Usage section in `CodePanel.tsx` to print the exact element invocation syntax with its precise customized props (e.g. `<FillSlider min={0} max={100} label="Volume" />`).
     - Feed these diversified parameters into the staged render tree in `Stage.tsx`.

2. **Success Criteria**
   - Switching `Component Type` immediately changes the control panel's available sections and sliders to fit that specific archetype.
   - The Code Panel's JSON text area displays a component-specific JSON object (e.g. Card config has `mediaHeight` and `bodyText` instead of `buttonVariant` or `icon`).
   - The React Usage block in the Code Panel outputs the correct tag name (e.g. `<Card ... />`, `<FillSlider ... />`) with its active properties.
   - All components sync and render properly with their custom parameters inside `Stage.tsx` and are fully interactive.

3. **Project Requirements**
   - **Data Schema Definition**:
     - Create typed schemas representing each component's specific configuration.
     - Modify `Home.tsx` to store a unified or component-keyed state map so that switching between component types retains and formats their specific configurations separately.
   - **Diversified Property Controls (`ControlPanel.tsx`)**:
     - Render custom property control groupings tailored to each `componentType`.
     - Button controls: Variant, Size, Icon, Success State, Label.
     - Card controls: Title/Label, Subtitle, Aspect Ratio/Media Height, Body Text, custom fill, custom color, custom radius, hover-tilt.
     - Slider controls: Label, Min, Max, Step, Default/Current Value, Track Color, Fill Color, Show Counter.
     - Name Tag controls: Header Text, Subheader Text, Name, Role, Level, Badge, Header Color, Punch Hole Toggle.
     - Slot controls: Cube Spin Speed, Cube Physics Density, Scale, Ambient Light, Sky Toggle, Floor Physical Material.
   - **Customized Code Panels (`CodePanel.tsx`)**:
     - Format JSON output dynamically to serialize only the active component's configuration properties.
     - Customize the React Usage code snippet block dynamically.
   - **Staged Render Integration (`Stage.tsx` & `/components/staged/`)**:
     - Wire the newly controlled properties into `Card.tsx`, `FillSlider.tsx`, `NameTag.tsx`, `Slot.tsx`.
     - Verify complete type safety and reactive synchronization.

4. **Architecture Decisions**
   - **Zustand-style state separation vs. Local State Hook**: We will leverage the existing state loop in `Home.tsx` but expand the properties object `MetaButtonProps` (or replace with a union/extensible structure) to capture all optional parameters safely, or use a component-keyed dictionary to preserve customizations for each element when the user switches tabs/types.
   - **State Dictionary Preservation**: We will keep a dictionary of properties for each component type in the `Home.tsx` state:
     ```typescript
     const [componentConfigs, setComponentConfigs] = useState({
       button: { label: 'Do Magic', variant: 'primary', size: 'L', icon: 'ph-sparkle', customFill: '', customColor: '', customRadius: '56px', disabled: false, enableSuccess: false },
       card: { label: 'Interactive Prototype', subtitle: 'PROTOTYPE', bodyText: 'A dynamic component demonstrating nested radius math and expressive typography...', customRadius: '40px', customFill: '', customColor: '', showMedia: true, mediaHeight: 200 },
       slider: { label: 'Scale', min: 0, max: 100, step: 1, defaultValue: 70, trackColor: '', fillColor: '' },
       nametag: { name: 'DESIGN AGENT', role: 'Senior Design Engineer & AI Collaborator', headerText: 'HELLO', subHeaderText: 'my name is', level: 'LVL 99', badgeText: 'PROTOTYPER', headerColor: '', punchHole: true },
       slot: { cubeSpeed: 1, cubeColor: '#4f46e5', cubeScale: 2, ambientIntensity: 0.25, enableSky: true, showFps: true },
       custom: { customCode: '// code...' }
     });
     ```
     This keeps each component's configuration completely independent, preserving the user's edits as they toggle types and ensuring different config JSON outputs!

5. **Pseudo Code (Shade DSL Mappings)**
   ```shade
   COMPONENT ControlCenter
   DATA
     state componentConfigs: Dict<ComponentType, Config>
     state activeType: ComponentType
   LOGIC
     action handlePropUpdate(key, value)
       componentConfigs[activeType][key] = value
   RENDER
     div.workspace
       ControlPanel
         switch(activeType)
           case 'button' => render ButtonControls(componentConfigs.button)
           case 'card' => render CardControls(componentConfigs.card)
           case 'slider' => render SliderControls(componentConfigs.slider)
           case 'nametag' => render NameTagControls(componentConfigs.nametag)
           case 'slot' => render SlotControls(componentConfigs.slot)
       CodePanel
         JSONEditor(stringify(componentConfigs[activeType]))
         ReactSnippet(formatSnippet(activeType, componentConfigs[activeType]))
       Stage
         ActiveComponent(activeType, componentConfigs[activeType])
   ```
