import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

async function connectRaylight() {
  console.log("Attempting to connect agent to Raylight MCP server at https://api.raylight.app/mcp...");
  
  const client = new Client(
    {
      name: "shade-ds-agent",
      version: "1.0.0",
    },
    {
      capabilities: {},
    }
  );

  try {
    const transport = new SSEClientTransport(new URL("https://api.raylight.app/mcp"), {
      eventSourceInit: {
        headers: {
          "Accept": "text/event-stream",
          "User-Agent": "ShadeAgent/1.0",
        },
      },
      requestInit: {
        headers: {
          "Accept": "text/event-stream",
          "User-Agent": "ShadeAgent/1.0",
        },
      },
    });

    console.log("Connecting transport...");
    await client.connect(transport);
    console.log("Successfully connected to Raylight!");

    const tools = await client.listTools();
    console.log("Available tools from Raylight:", tools.tools.map(t => t.name));

    await new Promise(resolve => setTimeout(resolve, 10000));
    await transport.close();
  } catch (err: any) {
    console.error("Connection output:", err.message);
  }
}

connectRaylight();
