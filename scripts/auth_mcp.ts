import { UniversalMCPClient } from "./mcp-client.js";
import fs from "fs";
import path from "path";

async function checkAuth() {
  const configPath = path.resolve(process.cwd(), "mcp-config.json");
  if (!fs.existsSync(configPath)) {
    console.error("mcp-config.json not found");
    return;
  }

  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  
  for (const [name, server] of Object.entries(config.servers) as [string, any][]) {
    console.log(`\n--- Testing ${name} ---`);
    const client = new UniversalMCPClient(name);
    try {
      if (server.type === "stdio") {
        await client.connectToStdio(server.command, server.args || []);
      } else {
        await client.connectToHTTP(server.url, server.headers || {});
      }
      
      const tools = await client.listTools();
      console.log(`Success! ${name} is connected. Found ${tools.tools.length} tools.`);
    } catch (err: any) {
      console.log(`${name} needs authentication or failed: ${err.message}`);
      if (name === "raylight") {
        console.log("Raylight Auth URL: https://raylight.app/auth (Please check for specific callback if needed)");
      } else if (name === "upsy") {
        console.log("Upsy Auth URL: https://upsy.ai/connect");
      }
    } finally {
      await client.close().catch(() => {});
    }
  }
}

checkAuth().catch(console.error);
