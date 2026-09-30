#!/bin/bash
# Desktop Service Manager: TigerVNC + XFCE4 + noVNC + Cloudflare Tunnel

set -e

ACTION="${1:-status}"
CLOUDFLARED_BIN="/tmp/cloudflared"
VNC_DISPLAY=":1"
VNC_PORT="5901"
NOVNC_PORT="6080"
LOG_DIR="/tmp/desktop_logs"

mkdir -p "$LOG_DIR"

ensure_cloudflared() {
    if [ ! -x "$CLOUDFLARED_BIN" ]; then
        echo "Downloading cloudflared..."
        curl -fsSL -o "$CLOUDFLARED_BIN" https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
        chmod +x "$CLOUDFLARED_BIN"
    fi
}

start() {
    echo "=== Starting Browser Desktop Service ==="
    ensure_cloudflared

    # 1. Clean locks
    rm -rf /tmp/.X1-lock /tmp/.X11-unix/X1

    # 2. Start TigerVNC if not running
    if ! pgrep -f "Xtigervnc $VNC_DISPLAY" > /dev/null; then
        echo "Starting Xtigervnc on $VNC_DISPLAY (port $VNC_PORT)..."
        Xtigervnc "$VNC_DISPLAY" -geometry 1280x800 -depth 24 -rfbport "$VNC_PORT" -SecurityTypes None -localhost > "$LOG_DIR/xvnc.log" 2>&1 &
        sleep 1
    fi

    # 3. Start XFCE Session if not running
    if ! pgrep -f "xfce4-session" > /dev/null; then
        echo "Starting XFCE desktop session..."
        DISPLAY="$VNC_DISPLAY" xfce4-session > "$LOG_DIR/xfce.log" 2>&1 &
        sleep 2
    fi

    # 4. Start noVNC / websockify if not running
    if ! pgrep -f "websockify.*$NOVNC_PORT" > /dev/null; then
        echo "Starting websockify on port $NOVNC_PORT..."
        ln -sf /usr/share/novnc/vnc.html /usr/share/novnc/index.html
        /usr/bin/websockify --web=/usr/share/novnc "$NOVNC_PORT" "localhost:$VNC_PORT" > "$LOG_DIR/websockify.log" 2>&1 &
        sleep 1
    fi

    # 5. Start Cloudflare Tunnel if not running
    if ! pgrep -f "cloudflared.*$NOVNC_PORT" > /dev/null; then
        echo "Starting Cloudflare tunnel to http://localhost:$NOVNC_PORT..."
        "$CLOUDFLARED_BIN" tunnel --url "http://localhost:$NOVNC_PORT" --protocol http2 > "$LOG_DIR/cloudflared.log" 2>&1 &
        sleep 5
    fi

    get_url
}

stop() {
    echo "=== Stopping Browser Desktop Service ==="
    pkill -f "cloudflared.*$NOVNC_PORT" || true
    pkill -f "websockify.*$NOVNC_PORT" || true
    pkill -f "xfce4-session" || true
    pkill -f "Xtigervnc $VNC_DISPLAY" || true
    rm -rf /tmp/.X1-lock /tmp/.X11-unix/X1
    echo "Service stopped."
}

get_url() {
    local url=""
    for i in {1..20}; do
        url=$(grep -ho 'https://[-a-zA-Z0-9\.]*\.trycloudflare\.com' "$LOG_DIR/cloudflared.log" /tmp/cloudflared.log 2>/dev/null | head -n 1 || true)
        if [ -n "$url" ]; then
            echo ""
            echo "=========================================================="
            echo "  LIVE SHAREABLE BROWSER DESKTOP URL:"
            echo "  $url/vnc.html?autoconnect=true&resize=remote"
            echo ""
            echo "  Root URL (with direct redirect):"
            echo "  $url"
            echo "=========================================================="
            echo ""
            return 0
        fi
        sleep 1
    done
    echo "Could not find active tunnel URL in logs yet. Check $LOG_DIR/cloudflared.log."
}

status() {
    echo "=== Service Status ==="
    echo -n "Xtigervnc:  "; pgrep -f "Xtigervnc $VNC_DISPLAY" > /dev/null && echo "RUNNING (pid $(pgrep -f "Xtigervnc $VNC_DISPLAY" | head -n 1))" || echo "STOPPED"
    echo -n "XFCE:       "; pgrep -f "xfce4-session" > /dev/null && echo "RUNNING" || echo "STOPPED"
    echo -n "WebSockify: "; pgrep -f "websockify.*$NOVNC_PORT" > /dev/null && echo "RUNNING on port $NOVNC_PORT" || echo "STOPPED"
    echo -n "Cloudflare: "; pgrep -f "cloudflared.*$NOVNC_PORT" > /dev/null && echo "CONNECTED" || echo "DISCONNECTED"
    get_url
}

case "$ACTION" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        stop
        sleep 2
        start
        ;;
    url)
        get_url
        ;;
    status)
        status
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|url}"
        exit 1
        ;;
esac
