#!/bin/bash
set -e

# Run setup
bash /app/applet/framer/test/setup_novnc_desktop.sh

# Kill any existing novnc or websockify processes
pkill -f websockify || true
pkill -f novnc_proxy || true
pkill -f cloudflared || true
sleep 1

# Start noVNC / websockify on 6080 -> 5901
echo "Starting noVNC proxy on port 6080..."
if command -v novnc_proxy >/dev/null 2>&1; then
    novnc_proxy --vnc localhost:5901 --listen 6080 --web /usr/share/novnc > /tmp/novnc.log 2>&1 &
elif command -v websockify >/dev/null 2>&1; then
    websockify --web /usr/share/novnc 6080 localhost:5901 > /tmp/novnc.log 2>&1 &
else
    echo "Neither novnc_proxy nor websockify found!"
    exit 1
fi

sleep 2
echo "Verifying local noVNC on 6080..."
curl -I http://localhost:6080/ || true

# Start cloudflared tunnel
echo "Starting Cloudflare tunnel to http://localhost:6080..."
/tmp/cloudflared tunnel --url http://localhost:6080 --protocol http2 > /tmp/cloudflared.log 2>&1 &

echo "Waiting for tunnel URL..."
for i in {1..20}; do
    TUNNEL_URL=$(grep -o 'https://[-a-zA-Z0-9\.]*\.trycloudflare\.com' /tmp/cloudflared.log | head -n 1 || true)
    if [ -n "$TUNNEL_URL" ]; then
        echo "=========================================="
        echo "SUCCESS: SHAREABLE DESKTOP URL:"
        echo "$TUNNEL_URL/vnc.html?autoconnect=true&resize=remote"
        echo "Direct Web Link: $TUNNEL_URL"
        echo "=========================================="
        break
    fi
    sleep 1
done
