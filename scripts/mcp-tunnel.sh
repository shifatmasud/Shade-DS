#!/bin/bash
# Standalone MCP Cloudflare Tunnel Manager
# Location: /scripts/mcp-tunnel.sh

set -e

ACTION="${1:-status}"
PORT="3000"
LOG_FILE="/tmp/mcp_tunnel.log"
BIN_PATH="$(pwd)/bin/cloudflared"

if [ ! -x "$BIN_PATH" ]; then
  if [ -x "/tmp/cloudflared" ]; then
    BIN_PATH="/tmp/cloudflared"
  elif command -v cloudflared >/dev/null 2>&1; then
    BIN_PATH="cloudflared"
  else
    echo "Downloading cloudflared binary..."
    mkdir -p "$(pwd)/bin"
    curl -fsSL -o "$(pwd)/bin/cloudflared" https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
    chmod +x "$(pwd)/bin/cloudflared"
    BIN_PATH="$(pwd)/bin/cloudflared"
  fi
fi

get_active_url() {
  if [ -f "$LOG_FILE" ]; then
    grep -ho 'https://[-a-zA-Z0-9\.]*\.trycloudflare\.com' "$LOG_FILE" 2>/dev/null | tail -n 1 || true
  fi
}

start_tunnel() {
  echo "Starting fresh Cloudflare Tunnel on port $PORT..."
  # Clean up any existing tunnel
  pkill -f "cloudflared.*$PORT" 2>/dev/null || true
  sleep 1
  rm -f "$LOG_FILE"

  # Check for permanent tunnel token
  if [ -n "$CLOUDFLARE_TUNNEL_TOKEN" ]; then
    echo "Using permanent Cloudflare Tunnel token..."
    "$BIN_PATH" tunnel run --token "$CLOUDFLARE_TUNNEL_TOKEN" > "$LOG_FILE" 2>&1 &
  else
    # Quick tunnel
    "$BIN_PATH" tunnel --url "http://localhost:$PORT" --protocol http2 > "$LOG_FILE" 2>&1 &
  fi

  echo "Waiting for tunnel URL to generate..."
  local url=""
  for i in {1..20}; do
    url=$(get_active_url)
    if [ -n "$url" ]; then
      break
    fi
    sleep 1
  done

  if [ -n "$url" ]; then
    echo ""
    echo "================================================================================"
    echo "  NEW LIVE MCP TUNNEL ACTIVE:"
    echo "  SSE Endpoint (Grok):   $url/mcp/sse"
    echo "  POST Endpoint (Grok):  $url/mcp"
    echo "  Discovery Dashboard:   $url/mcp"
    echo "================================================================================"
    echo ""
    echo "Paste the SSE Endpoint into Grok -> Settings -> Connectors"
    return 0
  else
    echo "Error: Failed to obtain tunnel URL. Check log at $LOG_FILE"
    exit 1
  fi
}

status_tunnel() {
  local pids=$(pgrep -f "cloudflared.*$PORT" || true)
  local url=$(get_active_url)

  if [ -n "$pids" ] && [ -n "$url" ]; then
    echo "MCP Tunnel is RUNNING (PID: $pids)"
    echo "Active SSE URL:  $url/mcp/sse"
    echo "Active POST URL: $url/mcp"
  else
    echo "MCP Tunnel is NOT RUNNING."
    echo "Run 'bash scripts/mcp-tunnel.sh renew' to start a fresh tunnel."
  fi
}

stop_tunnel() {
  echo "Stopping MCP Tunnel processes..."
  pkill -f "cloudflared.*$PORT" 2>/dev/null || true
  echo "Stopped."
}

case "$ACTION" in
  renew|restart|start)
    start_tunnel
    ;;
  status)
    status_tunnel
    ;;
  stop)
    stop_tunnel
    ;;
  url)
    get_active_url
    ;;
  *)
    echo "Usage: $0 {status|renew|restart|start|stop|url}"
    exit 1
    ;;
esac
