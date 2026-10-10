import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const FIGMA_TOKEN = process.env.FIGMA_TOKEN || "";

if (!FIGMA_TOKEN) {
  console.error("Warning: FIGMA_TOKEN is not set in environment variables.");
}

async function figmaFetch(endpoint: string, options: RequestInit = {}) {
  const token = process.env.FIGMA_TOKEN || "";
  const headers: Record<string, string> = {
    "X-Figma-Token": token,
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  const url = endpoint.startsWith("http")
    ? endpoint
    : `https://api.figma.com/v1${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Figma API error (${response.status}): ${errText}`);
  }
  return response.json();
}

const server = new Server(
  {
    name: "figma-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "figma_get_me",
        description: "Get authenticated Figma user profile info.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "figma_get_file",
        description: "Get metadata and layer hierarchy of a Figma design file.",
        inputSchema: {
          type: "object",
          properties: {
            fileKey: {
              type: "string",
              description: "The Figma file key (from URL https://figma.com/design/:fileKey/...)",
            },
            depth: {
              type: "number",
              description: "Hierarchy depth to return (default 2 for page overview)",
            },
          },
          required: ["fileKey"],
        },
      },
      {
        name: "figma_get_file_nodes",
        description: "Get detailed node tree data for specific node IDs in a Figma file.",
        inputSchema: {
          type: "object",
          properties: {
            fileKey: { type: "string", description: "The Figma file key" },
            ids: {
              type: "array",
              items: { type: "string" },
              description: "Array of node IDs (e.g. ['0:1', '12:34'])",
            },
          },
          required: ["fileKey", "ids"],
        },
      },
      {
        name: "figma_export_images",
        description: "Export Figma nodes or frames as SVG, PNG, JPG, or PDF images.",
        inputSchema: {
          type: "object",
          properties: {
            fileKey: { type: "string", description: "The Figma file key" },
            ids: {
              type: "array",
              items: { type: "string" },
              description: "Array of node IDs to render",
            },
            format: {
              type: "string",
              enum: ["png", "jpg", "svg", "pdf"],
              description: "Image output format (default 'svg')",
            },
            scale: {
              type: "number",
              description: "Image render scale 1-4 (default 1)",
            },
          },
          required: ["fileKey", "ids"],
        },
      },
      {
        name: "figma_get_styles",
        description: "Extract published design tokens & styles (colors, typography, grid, shadows) from a file.",
        inputSchema: {
          type: "object",
          properties: {
            fileKey: { type: "string", description: "The Figma file key" },
          },
          required: ["fileKey"],
        },
      },
      {
        name: "figma_get_components",
        description: "List all published components and component sets in a Figma file.",
        inputSchema: {
          type: "object",
          properties: {
            fileKey: { type: "string", description: "The Figma file key" },
          },
          required: ["fileKey"],
        },
      },
      {
        name: "figma_get_comments",
        description: "Get comments and feedback threads on a Figma file.",
        inputSchema: {
          type: "object",
          properties: {
            fileKey: { type: "string", description: "The Figma file key" },
          },
          required: ["fileKey"],
        },
      },
      {
        name: "figma_post_comment",
        description: "Post a new comment on a Figma file.",
        inputSchema: {
          type: "object",
          properties: {
            fileKey: { type: "string", description: "The Figma file key" },
            message: { type: "string", description: "The comment message" },
            clientMeta: {
              type: "object",
              description: "Optional position pin coordinates { x, y }",
            },
          },
          required: ["fileKey", "message"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "figma_get_me": {
        const data = await figmaFetch("/me");
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      }

      case "figma_get_file": {
        const { fileKey, depth = 2 } = args as { fileKey: string; depth?: number };
        const data = await figmaFetch(`/files/${fileKey}?depth=${depth}`);
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      }

      case "figma_get_file_nodes": {
        const { fileKey, ids } = args as { fileKey: string; ids: string[] };
        const idParam = ids.join(",");
        const data = await figmaFetch(`/files/${fileKey}/nodes?ids=${encodeURIComponent(idParam)}`);
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      }

      case "figma_export_images": {
        const { fileKey, ids, format = "svg", scale = 1 } = args as {
          fileKey: string;
          ids: string[];
          format?: string;
          scale?: number;
        };
        const idParam = ids.join(",");
        const data = await figmaFetch(
          `/images/${fileKey}?ids=${encodeURIComponent(idParam)}&format=${format}&scale=${scale}`
        );
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      }

      case "figma_get_styles": {
        const { fileKey } = args as { fileKey: string };
        const data = await figmaFetch(`/files/${fileKey}/styles`);
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      }

      case "figma_get_components": {
        const { fileKey } = args as { fileKey: string };
        const data = await figmaFetch(`/files/${fileKey}/components`);
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      }

      case "figma_get_comments": {
        const { fileKey } = args as { fileKey: string };
        const data = await figmaFetch(`/files/${fileKey}/comments`);
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      }

      case "figma_post_comment": {
        const { fileKey, message, clientMeta } = args as {
          fileKey: string;
          message: string;
          clientMeta?: unknown;
        };
        const data = await figmaFetch(`/files/${fileKey}/comments`, {
          method: "POST",
          body: JSON.stringify({ message, client_meta: clientMeta }),
        });
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err: any) {
    return {
      isError: true,
      content: [{ type: "text", text: `Figma MCP Error: ${err.message}` }],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Figma MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error running Figma MCP server:", error);
  process.exit(1);
});
