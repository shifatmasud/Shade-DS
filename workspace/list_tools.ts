import { listUpsyTools } from './services/upsyMcpService.ts';

async function main() {
  try {
    const tools = await listUpsyTools();
    console.log("Available Upsy Tools:", JSON.stringify(tools, null, 2));
  } catch (err) {
    console.error("Error listing upsy tools:", err);
  }
}

main();
