import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

async function connectUpsy() {
  console.log("Attempting to connect agent to Upsy MCP server at https://upsy.ai/connect...");
  
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
    const transport = new SSEClientTransport(new URL("https://upsy.ai/connect"), {
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
    console.log("Successfully connected to Upsy!");

    const tools = await client.listTools();
    console.log("Available tools from Upsy:", tools.tools.map(t => t.name));

    // Keep alive briefly to register connection
    await new Promise(resolve => setTimeout(resolve, 10000));
    await transport.close();
  } catch (err: any) {
    console.error("Connection attempt output / auth redirect info:", err.message);
    if (err.response) {
      console.error("Response headers:", err.response.headers);
    }
  }
}

connectUpsy();
