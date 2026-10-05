---
name: "figma-mcp"
description: |
  Inspect, extract, and convert Figma design files, components, tokens, styles, and nodes using the Figma Model Context Protocol (MCP) server integration.
  
  Use this skill in the following scenarios:
  * Figma Design Extraction: Inspecting layout hierarchies, design tokens, typography, colors, and components from a Figma URL or file key.
  * Node & Asset Export: Exporting specific Figma frames, vector nodes, or graphics as high-quality SVGs or PNGs.
  * Figma MCP Automation: Reading comments, posting feedback, and querying Figma metadata programmatically via MCP tools.
---

# Figma MCP Skill

This skill provides guidelines and tools for interacting with Figma design files via the Model Context Protocol (MCP). It allows fetching design hierarchies, extracting design tokens, rendering component assets, and translating Figma designs directly into React components and Shade DSL layouts.

---

## 1. Authentication & Configuration

The Figma MCP integration relies on `FIGMA_TOKEN` stored in the `.env` / environment variables.

To verify your Figma authentication:
```bash
npx tsx scripts/mcp-client.ts call figma_get_me '{}'
```

---

## 2. Executing Figma MCP Tools

You can execute Figma MCP tools via the CLI runner or programmatically using the `@modelcontextprotocol/sdk`.

### CLI Runner Usage
```bash
npx tsx scripts/mcp-client.ts call <tool_name> '<json_arguments>'
```

### Supported Tools Matrix

| Tool Name | Parameters | Description |
| :--- | :--- | :--- |
| **`figma_get_me`** | `{}` | Returns authenticated user profile (ID, handle, email). |
| **`figma_get_file`** | `fileKey` (string), `depth` (number, default: 2) | Returns document layer tree, pages, and top-level frames. |
| **`figma_get_file_nodes`** | `fileKey` (string), `ids` (array of strings) | Fetches full node tree for specific node IDs (e.g. `["0:1", "12:34"]`). |
| **`figma_export_images`** | `fileKey` (string), `ids` (array), `format` (`"svg"` \| `"png"` \| `"jpg"` \| `"pdf"`), `scale` (number, 1-4) | Renders and returns image download URLs for specified nodes. |
| **`figma_get_styles`** | `fileKey` (string) | Extracts published design tokens (colors, typography, grid, shadows). |
| **`figma_get_components`** | `fileKey` (string) | Lists published component sets and master components. |
| **`figma_get_comments`** | `fileKey` (string) | Retrieves comment threads and discussions from a file. |
| **`figma_post_comment`** | `fileKey` (string), `message` (string), `clientMeta` (optional object) | Posts a new comment or design feedback on a file. |

---

## 3. Workflow Examples

### A. Extract File Structure
Extract top-level structure to find page and frame IDs:
```bash
npx tsx scripts/mcp-client.ts call figma_get_file '{"fileKey": "YOUR_FILE_KEY", "depth": 2}'
```

### B. Extract Design Tokens & Typography
```bash
npx tsx scripts/mcp-client.ts call figma_get_styles '{"fileKey": "YOUR_FILE_KEY"}'
```

### C. Export Frame Asset as SVG
```bash
npx tsx scripts/mcp-client.ts call figma_export_images '{"fileKey": "YOUR_FILE_KEY", "ids": ["1:2"], "format": "svg"}'
```

---

## 4. Translating Figma to Shade DSL & React

When converting extracted Figma node hierarchies into React components:
1. **Map Tokens to `Theme.tsx`**: Align Figma fills, strokes, and typography with theme tokens (`theme.Surface`, `theme.Content`, `theme.Type`).
2. **Preserve Layout Hierarchy**: Convert Figma Auto-Layout groups to Flexbox (`display: "flex"`, `flexDirection`, `gap`, `padding`).
3. **Use Vector Graphics**: Download complex vector paths or illustrations as SVG using `figma_export_images`.
4. **Enforce Interactivity**: Ensure generated components include touch/mouse parity, hover states, and smooth Framer Motion transitions.
