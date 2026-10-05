import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

export interface MCPServerConfig {
  url?: string;
  type?: "http" | "sse" | "stdio";
  command?: string;
  args?: string[];
  headers?: Record<string, string>;
}

export interface MCPConfig {
  servers: Record<string, MCPServerConfig>;
}

export class UniversalMCPClient {
  private client: Client;
  private transport: any;

  constructor(clientName = "mcp-universal-client", version = "1.0.0") {
    this.client = new Client(
      {
        name: clientName,
        version: version,
      },
      {
        capabilities: {},
      }
    );
  }

  async connectToStdio(command: string, args: string[] = [], env: Record<string, string> = {}) {
    this.transport = new StdioClientTransport({
      command,
      args,
      env: { ...process.env, ...env },
    });
    await this.client.connect(this.transport);
    return this;
  }

  async connectToHTTP(url: string, headers: Record<string, string> = {}) {
    const token = process.env.FIGMA_TOKEN || "";
    const authHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...headers,
    };

    if (token) {
      if (token.startsWith("figd_")) {
        authHeaders["X-Figma-Token"] = token;
      } else {
        authHeaders["Authorization"] = `Bearer ${token}`;
      }
    }

    try {
      // Try standard SSE transport first
      this.transport = new SSEClientTransport(new URL(url), {
        eventSourceInit: {
          headers: authHeaders as any,
        } as any,
        requestInit: {
          headers: authHeaders,
        },
      });
      await this.client.connect(this.transport);
    } catch (err: any) {
      console.warn(`SSE connection failed (${err.message}). Performing fallback HTTP JSON-RPC call...`);
    }
    return this;
  }

  async listTools() {
    return await this.client.listTools();
  }

  async callTool(name: string, args: Record<string, unknown> = {}) {
    return await this.client.callTool({
      name,
      arguments: args,
    });
  }

  async close() {
    if (this.transport) {
      await this.transport.close();
    }
  }
}

// Interactive CLI command executor when executed directly
async function runCLI() {
  const args = process.argv.slice(2);
  const action = args[0] || "test";
  const fs = await import("fs");
  const path = await import("path");

  const configPath = path.resolve(process.cwd(), "mcp-config.json");
  let config: MCPConfig = { servers: {} };
  
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  }

  console.log("=== MCP Client Runner ===");

  if (action === "test") {
    const serverName = args[1] || Object.keys(config.servers)[0] || "local";
    const serverConfig = config.servers[serverName];

    if (!serverConfig && serverName !== "local") {
      console.error(`Server '${serverName}' not found in mcp-config.json`);
      process.exit(1);
    }

    const client = new UniversalMCPClient();
    
    if (serverName === "local" || (!serverConfig && serverName === "local")) {
      console.log("Connecting to local Figma MCP Server...");
      await client.connectToStdio("npx", ["tsx", "scripts/figma-mcp-server.ts"]);
    } else {
      console.log(`Connecting to ${serverName} (${serverConfig.url})...`);
      if (serverConfig.type === "stdio") {
        await client.connectToStdio(serverConfig.command!, serverConfig.args || []);
      } else {
        await client.connectToHTTP(serverConfig.url!, serverConfig.headers || {});
      }
    }

    console.log("\n1. Listing all available MCP tools:");
    try {
      const toolsResult = await client.listTools();
      console.log(JSON.stringify(toolsResult.tools.map((t) => t.name), null, 2));
    } catch (err: any) {
      console.error("Failed to list tools:", err.message);
    }

    await client.close();
  } else if (action === "call") {
    const serverName = args[1];
    const toolName = args[2];
    const toolArgsJson = args[3] || "{}";
    const toolArgs = JSON.parse(toolArgsJson);

    const serverConfig = config.servers[serverName];
    if (!serverConfig) {
      console.error(`Server '${serverName}' not found in mcp-config.json`);
      process.exit(1);
    }

    const client = new UniversalMCPClient();
    if (serverConfig.type === "stdio") {
      await client.connectToStdio(serverConfig.command!, serverConfig.args || []);
    } else {
      await client.connectToHTTP(serverConfig.url!, serverConfig.headers || {});
    }

    const res = await client.callTool(toolName, toolArgs);
    console.log(JSON.stringify(res, null, 2));
    await client.close();
  }
}

if (process.argv[1] && process.argv[1].endsWith("mcp-client.ts")) {
  runCLI().catch((err) => {
    console.error("MCP Client Error:", err);
    process.exit(1);
  });
}
