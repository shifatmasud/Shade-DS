---
name: browser-desktop
description: Provisions and orchestrates an interactive browser-accessible XFCE desktop environment using TigerVNC, WebSockify/noVNC, and a Cloudflare Tunnel. Use when the user requests a remote desktop, virtual GUI display, browser Linux workspace, or shareable VNC session.
---

# Overview & Architecture

This skill provisions a complete, performant, browser-based Linux desktop session within containerized environments. It exposes an XFCE graphical desktop to any web browser via WebSockets (RFB over WS) and delivers a secure, publicly accessible HTTPS URL via an automated Cloudflare Tunnel.

```
┌─────────────────┐       HTTPS / WSS        ┌────────────────────────────┐
│  User Browser   │ ───────────────────────► │  Cloudflare Edge Network   │
│  (noVNC Client) │                          │  (*.trycloudflare.com)     │
└─────────────────┘                          └─────────────┬──────────────┘
                                                           │ HTTP/2 Tunnel
                                                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Host / Container Environment                                            │
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ WebSockify + noVNC Web Server (Port 6080)                       │   │
│   │ Serves /usr/share/novnc assets & proxies WebSockets to RFB      │   │
│   └────────────────────────────────┬────────────────────────────────┘   │
│                                    │ TCP (127.0.0.1:5901)               │
│                                    ▼                                    │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ TigerVNC Server (Xtigervnc Display :1)                          │   │
│   │ Direct launch, RFC 6143 server, localhost-bound                 │   │
│   └────────────────────────────────┬────────────────────────────────┘   │
│                                    │ UNIX Domain Socket / X11           │
│                                    ▼                                    │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ XFCE4 Session & Window Manager (xfce4-session, xfwm4, xfce-panel)│  │
│   └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

# Prerequisites & Dependency Installation

In Debian/Ubuntu environments, install the required desktop components, TigerVNC server, and noVNC/WebSockify bridge.

### Critical Non-Interactive Safety Flags
Never run raw `apt-get install` without automated conffile flags in headless environments. Modified files (such as `/etc/fonts/conf.d/README` or `/etc/mime.types`) trigger interactive blocking prompts that halt headless shells.

Always use:
```bash
DEBIAN_FRONTEND=noninteractive apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
  -o Dpkg::Options::="--force-confdef" \
  -o Dpkg::Options::="--force-confold" \
  tigervnc-standalone-server \
  novnc \
  websockify \
  xfce4 \
  xfce4-terminal \
  dbus-x11 \
  xterm
```

If an installation was previously interrupted or hung on dpkg locks:
```bash
killall -9 apt-get dpkg 2>/dev/null || true
rm -f /var/lib/dpkg/lock* /var/lib/apt/lists/lock /var/cache/apt/archives/lock
DEBIAN_FRONTEND=noninteractive dpkg --configure -a --force-confdef --force-confold
```

# Display Server & TigerVNC Configuration

### Direct Xtigervnc Daemon (Bypassing Perl Wrapper)
Do **not** use the default `/usr/bin/vncserver` or `/usr/bin/tigervncserver` Perl wrapper scripts. The Perl wrapper polls TCP port `6000 + Display` to determine health; modern Xorg/TigerVNC disables TCP port 6000 for security, which causes the wrapper to time out after 30 seconds and kill the running server.

Launch `Xtigervnc` directly for instant initialization (<50ms):
```bash
# 1. Clean previous stale locks
rm -rf /tmp/.X1-lock /tmp/.X11-unix/X1

# 2. Start Xtigervnc on Display :1 (port 5901)
Xtigervnc :1 \
  -geometry 1280x800 \
  -depth 24 \
  -rfbport 5901 \
  -SecurityTypes None \
  -localhost \
  > /tmp/xvnc.log 2>&1 &

sleep 1
```

### XFCE Desktop Session Launch
Once the X server is running on `:1`, start the desktop session:
```bash
DISPLAY=:1 xfce4-session > /tmp/xfce.log 2>&1 &
sleep 2
```

# Web Gateway & noVNC Bridging

`websockify` bridges the browser's WebSocket connection to the local TigerVNC RFB TCP socket on port 5901, and simultaneously serves the static noVNC HTML5 web client.

### Configuration Steps
1. Create a root `index.html` symlink so opening the server root immediately redirects or renders the full desktop:
```bash
if [ -d "/usr/share/novnc" ] && [ -f "/usr/share/novnc/vnc.html" ]; then
    ln -sf /usr/share/novnc/vnc.html /usr/share/novnc/index.html
fi
```

2. Start WebSockify on port 6080:
```bash
pkill -f "websockify.*6080" || true
/usr/bin/websockify --web=/usr/share/novnc 6080 localhost:5901 > /tmp/websockify.log 2>&1 &
sleep 1
```

3. Verify local connectivity:
```bash
curl -I http://localhost:6080/
# Expected: HTTP/1.1 200 OK
```

# Cloudflare Tunnel Setup & Public Ingress

Expose port 6080 securely using `cloudflared` without requiring open firewall ports or domain configuration.

### Cloudflared Binary Acquisition
```bash
if [ ! -x "/tmp/cloudflared" ]; then
    curl -fsSL -o /tmp/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
    chmod +x /tmp/cloudflared
fi
```

### Tunnel Launch & URL Extraction
```bash
pkill -f "cloudflared.*6080" || true
/tmp/cloudflared tunnel --url http://localhost:6080 --protocol http2 > /tmp/cloudflared.log 2>&1 &

# Poll for registered trycloudflare.com URL
for i in {1..20}; do
    TUNNEL_URL=$(grep -ho 'https://[-a-zA-Z0-9\.]*\.trycloudflare\.com' /tmp/cloudflared.log 2>/dev/null | head -n 1 || true)
    if [ -n "$TUNNEL_URL" ]; then
        echo "Live Desktop URL: $TUNNEL_URL/vnc.html?autoconnect=true&resize=remote"
        break
    fi
    sleep 1
done
```

# Complete Automated Service Script

Below is the standalone reference script that encapsulates the entire lifecycle.

```bash
#!/bin/bash
set -e

ACTION="${1:-start}"
VNC_DISPLAY=":1"
VNC_PORT="5901"
NOVNC_PORT="6080"
LOG_DIR="/tmp/desktop_logs"

mkdir -p "$LOG_DIR"

start() {
    echo "Cleaning locks..."
    rm -rf /tmp/.X1-lock /tmp/.X11-unix/X1

    if ! pgrep -f "Xtigervnc $VNC_DISPLAY" > /dev/null; then
        echo "Starting Xtigervnc on $VNC_DISPLAY..."
        Xtigervnc "$VNC_DISPLAY" -geometry 1280x800 -depth 24 -rfbport "$VNC_PORT" -SecurityTypes None -localhost > "$LOG_DIR/xvnc.log" 2>&1 &
        sleep 1
    fi

    if ! pgrep -f "xfce4-session" > /dev/null; then
        echo "Starting XFCE session..."
        DISPLAY="$VNC_DISPLAY" xfce4-session > "$LOG_DIR/xfce.log" 2>&1 &
        sleep 2
    fi

    if ! pgrep -f "websockify.*$NOVNC_PORT" > /dev/null; then
        echo "Starting WebSockify on $NOVNC_PORT..."
        ln -sf /usr/share/novnc/vnc.html /usr/share/novnc/index.html
        /usr/bin/websockify --web=/usr/share/novnc "$NOVNC_PORT" "localhost:$VNC_PORT" > "$LOG_DIR/websockify.log" 2>&1 &
        sleep 1
    fi

    if ! pgrep -f "cloudflared.*$NOVNC_PORT" > /dev/null; then
        echo "Starting Cloudflare tunnel..."
        /tmp/cloudflared tunnel --url "http://localhost:$NOVNC_PORT" --protocol http2 > "$LOG_DIR/cloudflared.log" 2>&1 &
        sleep 5
    fi

    url
}

stop() {
    echo "Stopping all desktop services..."
    pkill -f "cloudflared.*$NOVNC_PORT" || true
    pkill -f "websockify.*$NOVNC_PORT" || true
    pkill -f "xfce4-session" || true
    pkill -f "Xtigervnc $VNC_DISPLAY" || true
    rm -rf /tmp/.X1-lock /tmp/.X11-unix/X1
    echo "Services stopped."
}

url() {
    for i in {1..20}; do
        TUNNEL_URL=$(grep -ho 'https://[-a-zA-Z0-9\.]*\.trycloudflare\.com' "$LOG_DIR/cloudflared.log" /tmp/cloudflared.log 2>/dev/null | head -n 1 || true)
        if [ -n "$TUNNEL_URL" ]; then
            echo "=========================================================="
            echo "BROWSER DESKTOP URL: $TUNNEL_URL/vnc.html?autoconnect=true&resize=remote"
            echo "=========================================================="
            return 0
        fi
        sleep 1
    done
    echo "Tunnel URL not detected yet. Check logs in $LOG_DIR/cloudflared.log"
}

case "$ACTION" in
    start) start ;;
    stop) stop ;;
    restart) stop; sleep 2; start ;;
    url) url ;;
    status)
        pgrep -f "Xtigervnc $VNC_DISPLAY" > /dev/null && echo "Xtigervnc: RUNNING" || echo "Xtigervnc: STOPPED"
        pgrep -f "xfce4-session" > /dev/null && echo "XFCE: RUNNING" || echo "XFCE: STOPPED"
        pgrep -f "websockify.*$NOVNC_PORT" > /dev/null && echo "WebSockify: RUNNING" || echo "WebSockify: STOPPED"
        pgrep -f "cloudflared.*$NOVNC_PORT" > /dev/null && echo "Cloudflare: CONNECTED" || echo "Cloudflare: DISCONNECTED"
        url
        ;;
    *) echo "Usage: $0 {start|stop|restart|status|url}" ;;
esac
```

# Scientific Debugging & Verification Playbook

### Diagnostic Checklist
| Checkpoint | Command | Expected Result |
| :--- | :--- | :--- |
| **RFB Port Listening** | `ss -tulpn \| grep 5901` | `127.0.0.1:5901 LISTEN` |
| **Web Gateway Port** | `curl -I http://localhost:6080/` | `HTTP/1.1 200 OK` |
| **noVNC HTML Asset** | `curl -s -o /dev/null -w "%{http_code}" http://localhost:6080/vnc.html` | `200` |
| **Edge Tunnel Health** | `curl -s -o /dev/null -w "%{http_code}" <TUNNEL_URL>` | `200` |

### Common Failure Modes & Quick Fixes
1. **"Xtigervnc did not start up" with exit code -1**:
   - Cause: Using the Perl `/usr/bin/vncserver` wrapper which expects TCP port 6001.
   - Fix: Launch `Xtigervnc :1 ...` directly.
2. **"dpkg frontend lock was locked"**:
   - Cause: Lingering apt or dpkg background process.
   - Fix: `killall -9 apt-get dpkg 2>/dev/null || true` and clean `/var/lib/dpkg/lock*`.
3. **Black screen or mouse cursor without desktop panel**:
   - Cause: `xfce4-session` failed or crashed during launch.
   - Fix: Ensure `dbus-x11` is installed and verify `DISPLAY=:1 xfce4-session`.
