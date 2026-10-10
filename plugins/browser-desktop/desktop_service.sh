#!/bin/bash
# Standalone High-Performance Browser Desktop Service Manager
# Stack: TigerVNC + XFCE4 + noVNC (WebSockify) + Cloudflare Tunnel
# Location: /plugins/browser-desktop/desktop_service.sh

set -e

ACTION="${1:-status}"
CLOUDFLARED_BIN="/tmp/cloudflared"
VNC_DISPLAY=":1"
VNC_PORT="5901"
NOVNC_PORT="6080"
LOG_DIR="/tmp/desktop_logs"
DESKTOP_WIDTH="${DESKTOP_WIDTH:-1280}"
DESKTOP_HEIGHT="${DESKTOP_HEIGHT:-800}"
DESKTOP_DEPTH="24"

mkdir -p "$LOG_DIR"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

# 1. Standalone Auto-Installer (Installs only missing packages in one fast noninteractive step)
ensure_environment() {
    local missing=()
    for cmd in Xtigervnc websockify startxfce4 dbus-launch xset import; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            missing+=("$cmd")
        fi
    done

    if [ ${#missing[@]} -gt 0 ]; then
        log "Missing dependencies detected: ${missing[*]}. Installing..."
        DEBIAN_FRONTEND=noninteractive apt-get update -y -qq
        DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
            -o Dpkg::Options::="--force-confold" \
            -o Dpkg::Options::="--force-confdef" \
            xfce4 xfce4-terminal tigervnc-standalone-server novnc websockify dbus-x11 x11-xserver-utils imagemagick
        log "Dependencies installed successfully."
    fi
}

ensure_cloudflared() {
    if [ ! -x "$CLOUDFLARED_BIN" ]; then
        log "Downloading latest cloudflared binary..."
        curl -fsSL -o "$CLOUDFLARED_BIN" https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
        chmod +x "$CLOUDFLARED_BIN"
    fi
}

# 2. Chrome Removal & Clean Startup Discipline
clean_autostart() {
    log "Enforcing clean startup (purging chrome & stale session cache)..."
    
    # Remove any Chrome / Chromium autostart desktop entries
    rm -f ~/.config/autostart/*chrom*.desktop 2>/dev/null || true
    rm -f /root/.config/autostart/*chrom*.desktop 2>/dev/null || true
    rm -f /etc/xdg/autostart/*chrom*.desktop 2>/dev/null || true
    rm -f /etc/xdg/autostart/*xscreensaver*.desktop 2>/dev/null || true

    # Clear saved sessions so closed/old browser instances never restore
    rm -rf ~/.cache/sessions/* 2>/dev/null || true
    rm -rf /root/.cache/sessions/* 2>/dev/null || true
}

# 3. Performance & Anti-Blanking Configurations
configure_performance() {
    export DISPLAY="$VNC_DISPLAY"
    
    # Disable Screen Saver and DPMS power saving (prevents black screen timeout)
    xset s off 2>/dev/null || true
    xset -dpms 2>/dev/null || true
    xset s noblank 2>/dev/null || true

    # High-Performance XFCE tweaks (Run once xfconfd is responsive)
    if command -v xfconf-query >/dev/null 2>&1; then
        # Disable compositing (Massive FPS boost and latency reduction over VNC)
        xfconf-query -c xfwm4 -p /general/use_compositing -n -t bool -s false 2>/dev/null || true
        # Disable auto-saving session on exit to prevent dirty restarts
        xfconf-query -c xfce4-session -p /general/SaveOnExit -n -t bool -s false 2>/dev/null || true
        xfconf-query -c xfce4-session -p /general/AutoSave -n -t bool -s false 2>/dev/null || true
    fi
}

start() {
    echo "=========================================================="
    echo "  Starting High-Speed Standalone Browser Desktop Service  "
    echo "=========================================================="
    ensure_environment
    ensure_cloudflared
    clean_autostart

    # Clean old locks
    rm -rf "/tmp/.X${VNC_DISPLAY#:}-lock" "/tmp/.X11-unix/X${VNC_DISPLAY#:}"

    # Step 1: Start TigerVNC Server directly with optimized flags
    if ! pgrep -f "Xtigervnc $VNC_DISPLAY" > /dev/null; then
        log "Starting TigerVNC on display $VNC_DISPLAY (port $VNC_PORT)..."
        Xtigervnc "$VNC_DISPLAY" \
            -geometry "${DESKTOP_WIDTH}x${DESKTOP_HEIGHT}" \
            -depth "$DESKTOP_DEPTH" \
            -rfbport "$VNC_PORT" \
            -SecurityTypes None \
            -localhost \
            -desktop "Cloud High-Speed Desktop" \
            -SendCutText=1 \
            -AcceptCutText=1 \
            > "$LOG_DIR/xvnc.log" 2>&1 &
        sleep 1
    fi

    # Step 2: Start XFCE4 Session with D-Bus Session Daemon
    if ! pgrep -f "xfce4-session" > /dev/null; then
        log "Starting XFCE4 desktop with D-Bus bus..."
        DISPLAY="$VNC_DISPLAY" dbus-launch --exit-with-session startxfce4 > "$LOG_DIR/xfce.log" 2>&1 &
        
        # Wait up to 5 seconds for desktop to initialize
        for i in {1..10}; do
            if DISPLAY="$VNC_DISPLAY" xset q >/dev/null 2>&1 && pgrep -f "xfwm4" >/dev/null; then
                break
            fi
            sleep 0.5
        done
        configure_performance
    fi

    # Step 3: Start noVNC / WebSockify Bridge
    if ! pgrep -f "websockify.*$NOVNC_PORT" > /dev/null; then
        log "Starting WebSockify on port $NOVNC_PORT..."
        if [ -d "/usr/share/novnc" ] && [ -f "/usr/share/novnc/vnc.html" ]; then
            ln -sf /usr/share/novnc/vnc.html /usr/share/novnc/index.html
        fi
        /usr/bin/websockify --web=/usr/share/novnc "$NOVNC_PORT" "localhost:$VNC_PORT" > "$LOG_DIR/websockify.log" 2>&1 &
        sleep 1
    fi

    # Step 4: Start Cloudflare Tunnel
    if ! pgrep -f "cloudflared.*$NOVNC_PORT" > /dev/null; then
        log "Starting Cloudflare Tunnel to port $NOVNC_PORT..."
        "$CLOUDFLARED_BIN" tunnel --url "http://localhost:$NOVNC_PORT" --protocol http2 > "$LOG_DIR/cloudflared.log" 2>&1 &
        sleep 4
    fi

    get_url
}

stop() {
    echo "=== Stopping Browser Desktop Service ==="
    pkill -f "cloudflared.*$NOVNC_PORT" 2>/dev/null || true
    pkill -f "websockify.*$NOVNC_PORT" 2>/dev/null || true
    pkill -f "xfce4-session" 2>/dev/null || true
    pkill -f "startxfce4" 2>/dev/null || true
    pkill -f "xfwm4" 2>/dev/null || true
    pkill -f "Xtigervnc $VNC_DISPLAY" 2>/dev/null || true
    rm -rf "/tmp/.X${VNC_DISPLAY#:}-lock" "/tmp/.X11-unix/X${VNC_DISPLAY#:}"
    log "All desktop services stopped cleanly."
}

get_url() {
    local url=""
    for i in {1..25}; do
        url=$(grep -ho 'https://[-a-zA-Z0-9\.]*\.trycloudflare\.com' "$LOG_DIR/cloudflared.log" /tmp/cloudflared.log 2>/dev/null | head -n 1 || true)
        if [ -n "$url" ]; then
            echo ""
            echo "================================================================================"
            echo "  FASTEST BROWSER DESKTOP URL (Auto-Connect + Remote Dynamic Resize):"
            echo "  $url/vnc.html?autoconnect=true&resize=remote&reconnect=true"
            echo ""
            echo "  Root Portal URL:"
            echo "  $url"
            echo "================================================================================"
            echo ""
            return 0
        fi
        sleep 1
    done
    echo "Could not find active tunnel URL in logs yet. Check $LOG_DIR/cloudflared.log."
}

status() {
    echo "=== Desktop Stack Status ==="
    echo -n "Xtigervnc:    "; pgrep -f "Xtigervnc $VNC_DISPLAY" > /dev/null && echo "RUNNING (pid $(pgrep -f "Xtigervnc $VNC_DISPLAY" | head -n 1))" || echo "STOPPED"
    echo -n "XFCE WM:      "; pgrep -f "xfwm4" > /dev/null && echo "RUNNING (Window Manager Active)" || echo "STOPPED"
    echo -n "XFCE Panel:   "; pgrep -f "xfce4-panel" > /dev/null && echo "RUNNING" || echo "STOPPED"
    echo -n "D-Bus Bus:    "; pgrep -f "dbus-daemon" > /dev/null && echo "RUNNING" || echo "STOPPED"
    echo -n "WebSockify:   "; pgrep -f "websockify.*$NOVNC_PORT" > /dev/null && echo "RUNNING on port $NOVNC_PORT" || echo "STOPPED"
    echo -n "Cloudflare:   "; pgrep -f "cloudflared.*$NOVNC_PORT" > /dev/null && echo "CONNECTED" || echo "DISCONNECTED"
    get_url
}

screenshot() {
    local out="${2:-/tmp/desktop_screenshot.png}"
    if command -v import >/dev/null 2>&1; then
        DISPLAY="$VNC_DISPLAY" import -window root "$out"
        echo "Screenshot captured to $out"
    else
        echo "Error: ImageMagick 'import' command not available."
    fi
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
    screenshot)
        screenshot "$@"
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|url|screenshot}"
        exit 1
        ;;
esac
