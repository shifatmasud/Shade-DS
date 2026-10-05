import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

async function pingUpsy() {
  console.log("Initiating MCP handshake with Upsy at https://upsy.ai/connect...");
  
  const client = new Client(
    {
      name: "Shade Agent",
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
          "User-Agent": "ModelContextProtocol/1.0",
        },
      },
      requestInit: {
        headers: {
          "Accept": "application/json, text/event-stream",
          "User-Agent": "ModelContextProtocol/1.0",
        },
      },
    });

    await client.connect(transport);
    console.log("Successfully established SSE connection with Upsy! Waiting screen should now update.");

    // Keep connection alive for 30 seconds so user can approve in browser
    await new Promise(resolve => setTimeout(resolve, 30000));
    await transport.close();
  } catch (err: any) {
    console.log("Connection result / Redirect info:", err.message);
  }
}

pingUpsy();
