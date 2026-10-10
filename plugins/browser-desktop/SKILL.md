---
name: browser-desktop
description: >
  Manages, controls, and diagnoses the headless XFCE4 desktop session with TigerVNC,
  noVNC (WebSockify), and Cloudflare Tunnel. Use when the user requests access to,
  management of, or debugging of the browser-accessible Linux desktop environment,
  including checking service status, retrieving the live public desktop URL, restarting
  the stack, capturing desktop screenshots, or configuring desktop performance.
---

# Browser Desktop Service Skill

This skill provides comprehensive instructions for operating, maintaining, and debugging the high-performance browser-based desktop environment powered by `plugins/browser-desktop/desktop_service.sh`.

The stack delivers a fully functional Linux desktop (XFCE4) accessible via any modern web browser through noVNC and an encrypted, public Cloudflare Tunnel without opening local firewall ports or configuring router port forwards.

---

# Architecture & Port Topology

The desktop architecture operates as an integrated multi-tier pipeline:

```
[User Web Browser]
       │
       ▼ (HTTPS / WSS via Public Edge)
[Cloudflare Edge Tunnel] (*.trycloudflare.com)
       │
       ▼ (HTTP/2 localhost:6080)
[WebSockify + noVNC Web Server] (Port 6080)
       │
       ▼ (Local RFB Protocol 127.0.0.1:5901)
[TigerVNC Server (Xtigervnc)] (Display :1)
       │
       ▼ (X11 Protocol via Unix Sockets / D-Bus)
[XFCE4 Desktop Session: xfwm4 + xfce4-panel + xfdesktop]
```

### Port and Display Assignments
* **Virtual Display**: `:1` (managed by `Xtigervnc`)
* **VNC RFB Port**: `5901` (`127.0.0.1:5901`, passwordless local RFB)
* **WebSockify / noVNC HTTP & WebSocket Port**: `6080` (`0.0.0.0:6080`)
* **Cloudflare Tunnel Protocol**: `http2` pointing to `http://localhost:6080`
* **Log Directory**: `/tmp/desktop_logs/` (`xvnc.log`, `xfce.log`, `websockify.log`, `cloudflared.log`)

---

# Prerequisites & Standalone Self-Healing

The manager script at `plugins/browser-desktop/desktop_service.sh` is completely self-healing and standalone. If executed in a newly spawned container where dependencies are missing, it automatically installs required packages and binaries non-interactively without user prompts.

### Core Required Packages
* `dbus-x11`: Provides `dbus-launch` (CRITICAL: without D-Bus, XFCE session fails to initialize window manager and panel, causing a black screen).
* `xfce4` & `xfce4-terminal`: Lightweight desktop environment and terminal emulator.
* `tigervnc-standalone-server`: Provides high-performance `Xtigervnc`.
* `novnc` & `python3-websockify`: Web-based VNC client and WebSocket proxy.
* `x11-xserver-utils`: Provides `xset` for anti-blanking/DPMS management.
* `imagemagick`: Provides `import` and `identify` for programmatic desktop screenshot verification.
* `cloudflared`: Downloaded dynamically to `/tmp/cloudflared` if not present.

---

# Script Location & Invocation

The primary script is located at `plugins/browser-desktop/desktop_service.sh` .

Always ensure execution permissions are set prior to running:
```bash
chmod +x plugins/browser-desktop/desktop_service.sh
```

### CLI Command Reference

| Action | Command | Description |
| :--- | :--- | :--- |
| **Status** | `plugins/browser-desktop/desktop_service.sh status` | Inspects process health for all 5 tiers and prints active tunnel URL. |
| **Start** | `plugins/browser-desktop/desktop_service.sh start` | Verifies packages, cleans locks, starts TigerVNC, XFCE, WebSockify, and Tunnel. |
| **Stop** | `plugins/browser-desktop/desktop_service.sh stop` | Gracefully terminates all desktop processes and clears X11 socket locks. |
| **Restart** | `plugins/browser-desktop/desktop_service.sh restart` | Performs a clean stop, waits 2 seconds, and launches the entire stack fresh. |
| **Get URL** | `plugins/browser-desktop/desktop_service.sh url` | Extracts and displays the active Cloudflare Tunnel URL. |
| **Screenshot** | `plugins/browser-desktop/desktop_service.sh screenshot [path]` | Captures root window of display `:1` (defaults to `/tmp/desktop_screenshot.png`). |

---

# URL Construction & Query Parameters

When sharing the desktop link with users or embedding it in applications, use the optimized parameter string for best responsiveness:

### 1. Recommended Direct URL (Instant, Responsive & Resilient)
```text
https://<subdomain>.trycloudflare.com/vnc.html?autoconnect=true&resize=remote&reconnect=true
```

### Key Parameter Explanations
* `autoconnect=true`: Bypasses the noVNC "Connect" prompt and immediately initiates session.
* `resize=remote`: Dynamically negotiates the X11 resolution to match the client's browser window or mobile viewport on the fly.
* `reconnect=true`: Automatically attempts reconnection if the network or tunnel briefly drops.
* `show_dot=true`: (Optional) Displays a high-contrast dot for mouse cursor location.

### 2. Root Redirect URL
```text
https://<subdomain>.trycloudflare.com
```
`plugins/browser-desktop/desktop_service.sh` automatically maintains a symlink (`/usr/share/novnc/index.html -> /usr/share/novnc/vnc.html`), ensuring root access directly loads noVNC.

---

# High-Performance Configuration Standards

To ensure the desktop remains the fastest possible and avoids latency or black screens:

### 1. Window Manager Compositing (Strictly Disabled)
Software compositing in headless virtual X11 sessions introduces significant CPU overhead and frame stuttering. Compositing must remain disabled:
```bash
DISPLAY=:1 xfconf-query -c xfwm4 -p /general/use_compositing -n -t bool -s false
```

### 2. Screen Blanking & DPMS Sleep (Strictly Disabled)
Virtual displays must never sleep or activate screen savers:
```bash
DISPLAY=:1 xset s off
DISPLAY=:1 xset -dpms
DISPLAY=:1 xset s noblank
```

### 3. Clean Autostart Discipline (No Chrome / Stale Sessions)
* Never allow web browsers to linger in session autostart:
  ```bash
  rm -f ~/.config/autostart/*chrom*.desktop /etc/xdg/autostart/*chrom*.desktop
  rm -rf ~/.cache/sessions/*
  ```
* Disable session auto-saving on exit:
  ```bash
  DISPLAY=:1 xfconf-query -c xfce4-session -p /general/SaveOnExit -n -t bool -s false
  DISPLAY=:1 xfconf-query -c xfce4-session -p /general/AutoSave -n -t bool -s false
  ```

---

# Verification & Diagnostics Workflow

Whenever making modifications, restarting, or diagnosing user-reported issues:

### Step 1: Check Process Health
Run:
```bash
plugins/browser-desktop/desktop_service.sh status
```
Verify that all 5 components report healthy:
* `Xtigervnc`: RUNNING
* `XFCE WM`: RUNNING
* `XFCE Panel`: RUNNING
* `D-Bus Bus`: RUNNING
* `WebSockify`: RUNNING on port 6080
* `Cloudflare`: CONNECTED

### Step 2: Visual Framebuffer Capture
Capture the display to rule out black screen regressions:
```bash
plugins/browser-desktop/desktop_service.sh screenshot /tmp/verify.png
identify /tmp/verify.png
```
A healthy XFCE desktop image file will typically be between `300 KB` and `600 KB` with active sRGB color variance. A solid black screen or uninitialized canvas is usually `< 10 KB`.

### Step 3: Public Edge Probe
Verify public edge reachability using `curl`:
```bash
url=$(plugins/browser-desktop/desktop_service.sh url | grep -o 'https://[-a-zA-Z0-9\.]*\.trycloudflare\.com' | head -n 1)
curl -s -o /dev/null -w "%{http_code}\n" "$url/vnc.html"
```
Expect HTTP `200`.

---

# Troubleshooting Common Edge Cases

### 1. Screen Appears Pure Black in Browser
* **Cause**: `dbus-launch` was missing when XFCE started, causing `xfwm4` and `xfdesktop` to fail.
* **Fix**: Ensure `dbus-x11` is installed, then run `plugins/browser-desktop/desktop_service.sh restart`.

### 2. "Display :1 Already in Use" or Stale Lock
* **Cause**: Previous X11 process crashed leaving `/tmp/.X1-lock`.
* **Fix**: The script's `start` and `restart` routines automatically execute:
  ```bash
  rm -rf /tmp/.X1-lock /tmp/.X11-unix/X1
  ```

### 3. Tunnel URL Not Showing
* **Cause**: Cloudflare rate-limiting or slow edge negotiation.
* **Fix**: Check `/tmp/desktop_logs/cloudflared.log` for edge connection logs or restart with `plugins/browser-desktop/desktop_service.sh restart`.
