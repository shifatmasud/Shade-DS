# Framer Agent Framework & DSL Reference Manual

This documentation provides an extensive guide to interacting with the Framer Agent workspace (`@framer/agent`), inspecting canvas state, applying design and page hierarchy modifications using Framer DSL commands, managing responsive breakpoints, working with rich text schemas, and deploying layouts safely.

---

## 1. High-Level Architecture & Lifecycle

The Framer Agent operates in a reactive workflow. For every change turn, the lifecycle always follows this sequence:

```
+------------------+     +------------------------+     +-------------------------+     +---------------------+
|   1. INSPECT     |     |   2. PLAN & SEARCH     |     |   3. APPLY (DSL)        |     |   4. REVIEW (Audit)  |
|  framer.agent    | --> |  font-search, control  | --> |  applyChanges(...)      | --> |  reviewChanges(...) |
|  getContext()    |     |  lookups, images       |     |  +Node, SET, DUPE, etc. |     |  Identify Warnings  |
+------------------+     +------------------------+     +-------------------------+     +---------------------+
```

- **Inspect**: Understand what already exists (read structure, view attributes, verify IDs, layout configurations).
- **Plan & Search**: Pull down the exact fonts, shader controls, or stock images needed for the requested visual mood.
- **Apply**: Execute surgical changes on the canvas through complete Framer DSL instruction strings.
- **Review**: Immediately call `reviewChanges` to analyze diagnostics, layout warnings, or compile errors. Correct any issues in sequential cycles.

### Running CLI Commands
When executing `@framer/agent` operations programmatically via Node script runners (like `-e`), remember that the interface is provided by importing native scripts or execution environments:
```bash
npx -y @framer/agent@0.0.33 exec -s <session_id> -e "const context = await framer.agent.getContext(); console.log(JSON.stringify(context));"
```

---

## 2. Connecting & Managing Framer Projects

To target any Framer web page or design canvas, you must establish an authorized connection to the specific project and create an active execution session.

### A. Authorizing & Creating Projects
The `@framer/agent` CLI offers robust tools to authenticate, clone, or spin up new Framer environments.

1. **Authorize an Existing Project (`auth`)**:
   Connects and saves credentials for any existing project using its shared URL or unique ID.
   ```bash
   npx -y @framer/agent@0.0.33 project auth <projectUrlOrId> [apiKey]
   ```
   *Note*: If `apiKey` is omitted, the CLI will fall back to browser-based interactive authentication or the current session's host environment setup credentials.

2. **Spin Up a Brand New Project (`new`)**:
   Creates a new canvas from scratch directly on Framer via a browser-approved validation hook, saving credentials locally upon completion.
   ```bash
   npx -y @framer/agent@0.0.33 project new
   ```

3. **Remix an Existing Project (`remix`)**:
   Clones/duplicates an existing canvas template environment via browser approval.
   ```bash
   npx -y @framer/agent@0.0.33 project remix <sourceProjectUrlOrId>
   ```

4. **List Available Projects (`list`)**:
   Retrieves recently configured project URLs, IDs, and active metadata:
   ```bash
   npx -y @framer/agent@0.0.33 project list
   ```

### B. Session Management
An active session acts as the headless, live proxy connecting your code changes to the Framer canvas.

1. **Create a Session (`session new`)**:
   To execute queries or post DSL changes, initialize a session for your project. This command prints out the `<session_id>` (e.g. `2`):
   ```bash
   npx -y @framer/agent@0.0.33 session new <projectUrlOrId>
   ```

2. **List Active Sessions (`session list`)**:
   Provides a list of all current background execution sessions:
   ```bash
   npx -y @framer/agent@0.0.33 session list
   ```

3. **Terminate a Session (`session destroy`)**:
   Terminates a specific websocket or headless driver proxy connection safely:
   ```bash
   npx -y @framer/agent@0.0.33 session destroy <sessionId>
   ```

### C. Putting It Together: A Full Connection and Execution Flow
Below is a complete bash and Node execution sequence demonstrating how to connect a custom Framer project, spin up a session, query the environment context, apply a visual change, and publish it:

```bash
# Step 1: Authorize the target Framer project
npx -y @framer/agent@0.0.33 project auth "https://framer.com/projects/my-awesome-site--xyz"

# Step 2: Initialize a new execution session (let's assume it returns session ID '2')
npx -y @framer/agent@0.0.33 session new "https://framer.com/projects/my-awesome-site--xyz"

# Step 3: Run programmatic inspection & application using the session ID
npx -y @framer/agent@0.0.33 exec -s 2 -e "
// Query context (loaded fonts, shaders, page sitemap)
const context = await framer.agent.getContext();
console.log('Project site-map:', JSON.stringify(context.siteMap));

// Build a neon hero section DSL
const dsl = [
  '+FrameNode heroSection parent=\"tRvlhiW1G\";',
  'SET heroSection layout=\"stack\" stackDirection=\"vertical\" width=\"100%\" height=\"600px\" fill=\"#050508\" stackAlignment=\"center\" stackDistribution=\"center\" gap=24;',
  '+ShaderNode heroShader shader=\"liquid-gradient\" parent=\"heroSection\";',
  'SET heroShader position=\"absolute\" left=\"0\" right=\"0\" top=\"0\" bottom=\"0\" zIndex=1;',
  '+RichTextNode heroTitle parent=\"heroSection\";',
  'SET heroTitle text=\"Hello World\" fontName=\"Futura Now Headline\" fontWeight=\"800\" fontSize=\"64px\" textColor=\"#FFFFFF\" zIndex=2;'
].join(' ');

// Apply the DSL changes to the target page /vibrant
const response = await framer.agent.applyChanges(dsl, { pagePath: '/vibrant' });
console.log('Changes Applied Status:', response.status);

// Run validation diagnostics
const audit = await framer.agent.reviewChanges({ pagePath: '/vibrant' });
console.log('Diagnostics Warnings:', JSON.stringify(audit.warnings));

// Trigger clean web publication
const preview = await framer.agent.publish({ action: 'preview' });
const publish = await framer.agent.publish({
  action: 'confirm_publish',
  confirmationHash: preview.confirmationHash
});
console.log('Live Production URL:', publish.urls.production);
"
```

---

## 3. Global Inspection & Lookup APIs

To prevent guessing or writing incorrect node IDs, always search the canvas or look up asset rules first.

### A. Context & Configuration Lookups

#### `framer.agent.getContext()`
Fetches root configuration metadata, including:
- `<project-fonts>`: Initial fonts loaded for public/private use.
- `<custom-fonts>`: Uploaded custom typography families (such as `"Inter Variable"`, `"Matter"`, `"Futura Now Headline"`).
- `<available-components>`: Pre-packaged standard modules (Cookie Banners, GIF players, Cal.com scheduling, Typeform) or local TypeScript files.
- `<available-shaders>`: Supported GPU shaders (like `liquid-gradient`, `mesh`, `holo`, `wave-gradient`, `particles`).
- `<site-map>`: Maps of Page IDs to URL slug-paths.

#### `framer.agent.readShaderControls({ shaderNames })`
Fetches a JSON map of configuration controls, valid ranges, step sizes, and default values for specific shaders.
```typescript
const controls = await framer.agent.readShaderControls({ shaderNames: ['liquid-gradient', 'holo'] });
```

#### `framer.agent.readIconSetControls({ iconSetNames })` / `readIcons({ iconSetName })`
Used to check which icon names are available inside any given vector pack (e.g., `Lucide`, `Meteor`, `Phosphor`).

### B. Canvas Traversal APIs

Use these methods rather than retrieving the entire page tree repeatedly.

- **`framer.agent.getNode({ id }, { pagePath })`**: Read a single node's shallow details.
- **`framer.agent.getNodes({ ids }, { pagePath })`**: Read multi-node structures simultaneously.
- **`framer.agent.getScopeNode({ id }, { pagePath })`**: Jump to the closest Breakpoint or Variant scope boundary.
- **`framer.agent.getGroundNode({ id }, { pagePath })`**: Retrieve the nearest visual baseline ground frame.
- **`framer.agent.getParentNode({ id }, { pagePath })`**: Target the immediate wrapping ancestor.
- **`framer.agent.getAncestors({ id }, { pagePath })`**: Output the full path chain to the root page element.
- **`framer.agent.serialize({ id, depth, attributeFilter, ancestorPath }, { pagePath })`**: Fully dehydrate a node.
  - Set `attributeFilter: []` to cleanly read only structure, or target specific fields (e.g., `["$rect", "appearEffect"]`) to optimize token weight.

---

## 4. Framer DSL Syntax Specification

All canvas adaptations are committed via `framer.agent.applyChanges(commandsString, { pagePath })`. Multiple instructions are separated by semicolons (`;`). 

### Core Command List

| Command | Signature & Explanation |
| :--- | :--- |
| **`+WebPageNode`** | `+WebPageNode <id> name="<Display Name>" path="<url-path>";`<br>Creates a draft layout container for internal site map routing. |
| **`+FrameNode`** | `+FrameNode <id> parent="<parent_id>" [position="<index>"];`<br>Creates a dynamic frame. Position defines child stack stacking sequence. |
| **`+ComponentNode`** | `+ComponentNode <id> name="<Name>";`<br>Initializes a reusable local component structure with standard variables. |
| **`+ComponentInstanceNode`** | `+ComponentInstanceNode <id> component="<stable_ref>" parent="<parent_id>";`<br>Embeds a component preset (e.g. Code Block, Cal schedule, waitlist loops). |
| **`+ShaderNode`** | `+ShaderNode <id> shader="<shader_name>" parent="<parent_id>";`<br>Mounts a WebGL instance. *Must contain `shader="..."` inside the instantiation command.* |
| **`+IconNode`** | `+IconNode <id> set="<set_name>" $control__icon="<icon_name>" parent="<parent_id>";`<br>Inserts a vector symbol directly. |
| **`+RichTextNode`** | `+RichTextNode <id> parent="<parent_id>";`<br>A canvas node hosting styled paragraphs, headings, blockquotes, lists, or tables. |
| **`SET`** | `SET <id> <attr1>="<val1>" <attr2>="<val2>" ...;`<br>Surgically updates specific styling, control variables, layouts, or transitions. |
| **`DEL`** | `DEL <id>;`<br>Deletes a node or variable safely. |
| **`DUPE`** | `DUPE <source_id> newId="<dest_id>" [parent="<dest_parent>" position="<index>"];`<br>Clones a tree structure with its exact assets and states. |
| **`MOVE`** | `MOVE <id> parent="<dest_parent>" [position="<index>"];`<br>Updates parent node assignment or list ordering position. |
| **`CREATE_VARIANT`** | `CREATE_VARIANT <new_variant_id> from="<source_variant_id>" [gesture="hover\|pressed"];`<br>Generates responsive WebPage Breakpoints or Interactive Component Variants. |

---

## 5. Layout Mechanics: Stacks & Grids

Framer uses auto-layout engines instead of static desktop offsets to achieve organic responsivity.

### A. Dynamic Sizing & Sibling Distribution
To model interfaces cleanly, analyze the role of each node and set exact width/height rules:

1. **Top-level Container Section / Hero Boundary**:
   - Width: `100%` or primary viewport widths (e.g. `1200px` for Desktop).
   - Height: `auto` if containing a stack of responsive items, or explicit viewport scales (e.g. `680px`, `100vh`) for theatrical sections.
2. **Centered Content Wrapper inside a Section**:
   - Set to `width="100%"` with a standard layout constraint like `maxWidth="1050px"` or `1200px` to maintain content boundaries.
3. **Internal Columns / Bento Boxes**:
   - Set `width="1fr"` on sibling components for equal distribution inside horizontal parent stacks.
   - For components with fixed contents, keep `width="auto"` (hugging) or set responsive custom sizes.

### B. Standardizing Stack Properties
Always replace arbitrary positioning or absolute coordinates with a clean, parent-managed layout.
- Horizontal Stack: `layout="stack" stackDirection="horizontal" stackAlignment="center" gap="24px" width="100%"`
- Vertical Stack: `layout="stack" stackDirection="vertical" stackAlignment="start" gap="16px" height="auto"`
- Spacing Separation: Visible separation between sibling elements must come from the parent stack's `gap` combined with appropriate `padding` on outer containers. Do not use negative margins or offset pins for relative layouts.
- Centering breakouts elegantly: When breaking content elements symmetrically out of container grids (e.g., editorial figures), configure `stackAlignment="center"` on the parent wrapper and size children using `width`. Do not use absolute left overlays that would disrupt flow.

### C. Grid-to-Stack Responsive Fallback Rule
When adapting an existing multi-column responsive grid on phone or tablet viewport scales:
1. Do not simply swap the column layout counter with `gridColumnCount="1"`.
2. Convert the node to `layout="stack"` with `stackDirection="vertical"` to let elements flow cleanly down the page.
3. Ensure child cards are reset to `width="1fr"` and `height="auto"` to prevent trailing overflows.

---

## 6. WebGL Shader Integration Guide

Shaders run high-performance graphical effects directly on the GPU. You can add them as background canvases, cards, or hero graphics.

### Popular Shader Parameters (Configured with `SET`)

#### `liquid-gradient` (Fluid, blob, organic backgrounds)
```
SET myLiquidShader 
  $control__colors=["#090A0F", "#2962FF", "#FF2E93", "#FFAE00"]
  $control__seed=648 
  $control__speed=0.35 
  $control__scale=0.5
  $control__turbAmp=0.6 
  $control__waveFreq=4.0 
  $control__ditherMode=2 
  $control__dither=0.08;
```

#### `holo` (Iridescent, liquid warp, metallic chrome filters)
```
SET myHoloShader 
  $control__seed=600 
  $control__speed=0.6 
  $control__scale=1.2 
  $control__turbAmp=1.1 
  $control__warp=6.5 
  $control__fringeFreq=0.4 
  $control__bandSpread=1.15 
  $control__exposure=8.5;
```

#### `wave-gradient` (Clean flowing ocean ripples)
```
SET myWaveShader 
  $control__colors=["#FF3624", "#9EABFF", "#FFAE00", "#E29EFF"]
  $control__seed=32 
  $control__waveSpeed=1.5 
  $control__waveFreqX=1.0 
  $control__waveFreqY=5.5 
  $control__waveAngle=105 
  $control__waveAmplitude=1.8 
  $control__maskSoftness=0.74 
  $control__blendAmount=0.55;
```

---

## 7. Material Rich Text & Typographic Hierarchy

A `RichTextNode` serves as a semantic rich text container. Avoid simple hardcoded strings; instead, map structured, multi-paragraph document layouts using sub-components.

```
       [RichTextNode]
             │
      ┌──────┴──────┐
 [TextBlock]   [TextBulletList]
  (tag="h1")        │
      │        [TextListItem]
  [TextRun]         │
  (styled)     [TextBlock]
                    │
                [TextRun]
```

### A. Sub-Node Core Elements
- **`+TextBlock`**: Defines structural blocks. Pass block semantics with `tag="h1"`, `tag="h2"`, ..., `tag="p"`.
- **`+TextRun`**: Hosts the actual characters. Apply visual weights, colors, tracking, and stylistic attributes directly on individual runs.
- **`+TextLineBreak`**: Embed inside text blocks to insert a simple hard break.
- **`+TextBulletList` / `+TextNumberedList` / `+TextListItem`**: Synthesize list layouts semantically. Avoid fake dash spacing workarounds.

### B. High-Contrast DSL Snippet Example
```
// Initialize root rich text node
+RichTextNode introParagraph parent="textWrapper";
SET introParagraph position="relative" width="100%" height="auto";

// Create Headline layout group
+TextBlock welcomeHeading tag="h1" parent="introParagraph";
+TextRun headingText parent="welcomeHeading";
SET headingText text="Framer Agent " fontName="Inter Variable" fontWeight="800" fontSize="48px" textColor="#FFFFFF";

+TextRun headingSlogan parent="welcomeHeading";
SET headingSlogan text="Showcase" fontName="Futura Now Headline" fontWeight="800" fontSize="48px" textColor="#FF2E93";

// Create Paragraph layout group
+TextBlock bodyText tag="p" parent="introParagraph";
+TextRun p1 parent="bodyText";
SET p1 text="Easily build immersive multi-viewport pages using standard declarative commands." fontName="Inter Variable" fontWeight="400" fontSize="16px" textColor="rgba(255,255,255,0.7)" lineHeight="26px";
```

### C. Style Preset Responsive Breakpoints
Framer's text presets let you change font size dynamically based on responsive viewports via relative key variables:
```
SET headingStylePreset
  breakpoint.default.fontSize="48px"
  breakpoint.default.lineHeight="56px"
  breakpoint.medium.fontSize="36px"
  breakpoint.medium.lineHeight="44px"
  breakpoint.small.fontSize="28px"
  breakpoint.small.lineHeight="36px";
```

---

## 8. Interactive Variable Bindings & Event Handlers

Framer pages use local variables to configure state, interact with presets, or bind interactive attributes.

### A. Variable Types
- `+Variable <id> name="<Name>" type="string" scope="<scope_id>" initialValue="<val>"`
- `+DateVariable` / `+OptionVariable` / `+EventHandlerVariable` / `+LinkVariable` / `+FileVariable` / `+IconVariable` / `+GalleryVariable`

### B. Inline Computed Values & Transforms
When binding text properties dynamically, you can format input values on the fly:
```
SET cardLabel text.from="var(--variable-stockAvailability)" 
    text.transforms.0.name="convertFromBoolean" 
    text.transforms.0.outputType="string" 
    text.transforms.0.truthy="In stock" 
    text.transforms.0.falsy="Out of stock";
```

### C. Trigger Event Navigation
```
// Configure a card element to change component state on hover or tap
SET myCardButton
  onTap.0.action="SET_VARIANT"
  onTap.0.controls.variant="activeState"
  cursor="pointer";
```

---

## 9. Viewports & Responsive Design Checklist

Before publishing, evaluate how assets display across multiple device breaks:

### 1. Viewport Defaults
Always generate viewports in standard descending constraints:
- **Desktop (Primary)**: Width `1200px`
- **Tablet (Replica)**: Width `810px` (derived with `CREATE_VARIANT tablet from="desktopPrimary"`)
- **Phone (Replica)**: Width `390px` (derived with `CREATE_VARIANT phone from="desktopPrimary"`)

### 2. Responsiveness Audit Steps
- **Convert headers**: Convert top nav row lines with horizontal layout spacing into responsive mobile hamburger blocks or slide-out overlay containers.
- **Scale typography**: Downscale large main titles (e.g. from `72px` to `42px` / `32px` on smaller screen sizes).
- **Inspect padding values**: Downscale excessive padding (e.g., from `64px` all-around desktop spacing to `24px` / `16px` margin gaps).
- **Test in-grid child spacing**: Ensure direct grid columns respect wrapping rules. Apply standard spacing constraints to avoid visual clipping.

---

## 10. Reviewing and Publishing Actions

Once changes are applied, run validation and deploy directly:

### 1. Verification
```typescript
const audit = await framer.agent.reviewChanges({ pagePath: '/vibrant' });
// Correct warning indicators immediately before final publish pipelines
```

### 2. Release to Production
Avoid guessing URLs. Pre-check readiness with a staging build, and subsequently ship to your domain:
```typescript
// Step A: Preview readiness assessment and hash generation
const preview = await framer.agent.publish({ action: "preview" });

// Step B: Direct production publish using confirmation tokens
const ship = await framer.agent.publish({ 
  action: "confirm_publish", 
  confirmationHash: preview.confirmationHash 
});
```
