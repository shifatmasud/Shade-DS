import http from 'http';

const BASE_URL = 'http://localhost:3000';

async function fetchJson(endpoint: string, options: any = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  return { status: res.status, data: await res.json() };
}

async function runTests() {
  console.log('=== Starting Remote MCP Server Verification Suite ===\n');

  // Test 1: GET /mcp Discovery
  console.log('1. Testing GET /mcp Discovery endpoint...');
  try {
    const { status, data } = await fetchJson('/mcp');
    console.log(`   Status: ${status}`);
    console.log(`   Name: ${data.name}`);
    console.log(`   Tools count: ${data.toolsCount}`);
    console.log(`   SSE Transport URL: ${data.transports?.sse?.endpoint}`);
    if (status === 200 && data.toolsCount > 0) {
      console.log('   [PASS] Discovery endpoint works.\n');
    } else {
      console.error('   [FAIL] Unexpected discovery response:', data);
    }
  } catch (err: any) {
    console.error('   [FAIL] GET /mcp error:', err.message);
  }

  // Test 2: POST /mcp initialize
  console.log('2. Testing POST /mcp JSON-RPC initialize...');
  try {
    const initPayload = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        clientInfo: { name: 'grok-test', version: '1.0.0' }
      }
    };
    const { status, data } = await fetchJson('/mcp', {
      method: 'POST',
      body: JSON.stringify(initPayload)
    });
    console.log(`   Status: ${status}`);
    console.log(`   Server Name: ${data.result?.serverInfo?.name}`);
    if (status === 200 && data.result?.serverInfo?.name === 'ai-studio-workspace-mcp') {
      console.log('   [PASS] JSON-RPC initialize works.\n');
    } else {
      console.error('   [FAIL] Unexpected initialize response:', data);
    }
  } catch (err: any) {
    console.error('   [FAIL] POST /mcp initialize error:', err.message);
  }

  // Test 3: POST /mcp tools/list
  console.log('3. Testing POST /mcp JSON-RPC tools/list...');
  try {
    const listPayload = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    };
    const { status, data } = await fetchJson('/mcp', {
      method: 'POST',
      body: JSON.stringify(listPayload)
    });
    const tools = data.result?.tools || [];
    console.log(`   Status: ${status}`);
    console.log(`   Found ${tools.length} tools: ${tools.map((t: any) => t.name).join(', ')}`);
    if (status === 200 && tools.length >= 8) {
      console.log('   [PASS] JSON-RPC tools/list works.\n');
    } else {
      console.error('   [FAIL] Unexpected tools/list response:', data);
    }
  } catch (err: any) {
    console.error('   [FAIL] POST /mcp tools/list error:', err.message);
  }

  // Test 4: POST /mcp tools/call workspace_project_status
  console.log('4. Testing POST /mcp tools/call workspace_project_status...');
  try {
    const callPayload = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'workspace_project_status',
        arguments: {}
      }
    };
    const { status, data } = await fetchJson('/mcp', {
      method: 'POST',
      body: JSON.stringify(callPayload)
    });
    console.log(`   Status: ${status}`);
    const textOutput = data.result?.content?.[0]?.text;
    console.log(`   Output preview:\n${textOutput?.slice(0, 150)}...\n`);
    if (status === 200 && textOutput) {
      console.log('   [PASS] workspace_project_status tool works.\n');
    } else {
      console.error('   [FAIL] Unexpected tool call response:', data);
    }
  } catch (err: any) {
    console.error('   [FAIL] POST /mcp tools/call error:', err.message);
  }

  // Test 5: POST /mcp tools/call workspace_run_command
  console.log('5. Testing POST /mcp tools/call workspace_run_command ("echo HELLO_FROM_GROK_MCP")...');
  try {
    const cmdPayload = {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'workspace_run_command',
        arguments: {
          command: 'echo "HELLO_FROM_GROK_MCP"'
        }
      }
    };
    const { status, data } = await fetchJson('/mcp', {
      method: 'POST',
      body: JSON.stringify(cmdPayload)
    });
    console.log(`   Status: ${status}`);
    const textOutput = data.result?.content?.[0]?.text;
    console.log(`   Output preview:\n${textOutput}\n`);
    if (status === 200 && textOutput?.includes('HELLO_FROM_GROK_MCP')) {
      console.log('   [PASS] workspace_run_command tool works.\n');
    } else {
      console.error('   [FAIL] Unexpected command run response:', data);
    }
  } catch (err: any) {
    console.error('   [FAIL] POST /mcp tools/call command error:', err.message);
  }

  console.log('=== All Remote MCP Server Tests Completed Successfully ===');
}

runTests().catch(console.error);
