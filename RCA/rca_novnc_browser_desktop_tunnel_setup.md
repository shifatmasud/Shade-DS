# Root Cause Analysis & Architecture Spec: noVNC Browser Desktop with Cloudflare Tunnel

## 1. Executive Summary
- **Request**: Configure the environment as a shareable, browser-based desktop using TigerVNC, noVNC, and a Cloudflare Tunnel, returning a live shareable public URL.
- **Outcome**: Successfully deployed XFCE4, TigerVNC (`:1` on `5901`), noVNC/WebSockify (`6080`), and Cloudflare Tunnel (`trycloudflare.com`).
- **Live Shareable URL**:
  - Direct Auto-connect: `https://roland-arrangement-recommend-chassis.trycloudflare.com/vnc.html?autoconnect=true&resize=remote`
  - Web Root: `https://roland-arrangement-recommend-chassis.trycloudflare.com`

---

## 2. Architecture & Pipeline
```
[User Browser]
      │
      ▼ (HTTPS / WSS)
[Cloudflare Edge Tunnel] (roland-arrangement-recommend-chassis.trycloudflare.com)
      │
      ▼ (HTTP/2 localhost:6080)
[WebSockify + noVNC Web Server] (Port 6080)
      │
      ▼ (RFC 6143 RFB Protocol)
[TigerVNC Server (Xtigervnc)] (Display :1, Port 5901)
      │
      ▼
[XFCE4 Desktop Session + Window Manager]
```

---

## 3. Root Cause Analysis of Intermediate Failure Modes

### Issue 1: APT Package Installation Stalled in DPKG Configure
- **Symptom**: `apt-get install` hung during `dpkg --configure --pending`.
- **Root Cause**: Package `fontconfig-config` had modified configuration files (`/etc/fonts/conf.d/README`) which triggered dpkg's interactive conffile prompt (`What would you like to do about it? (Y/I/N/O/D/Z) [default=N]`). In a non-TTY headless subshell, dpkg blocked waiting for standard input.
- **Resolution**: Implemented non-interactive dpkg overrides:
  `DEBIAN_FRONTEND=noninteractive dpkg --configure -a --force-confdef --force-confold`.

### Issue 2: TigerVNC Perl Wrapper False-Failure Timeout
- **Symptom**: Running `/usr/bin/vncserver :1` timed out after 30 seconds and killed Xtigervnc.
- **Root Cause**: Line 1120 of `/usr/share/perl5/TigerVNC/Wrapper.pm` polls `checkTCPPortUsed(6000 + displayNumber)` (X11 TCP listener on port 6001). Modern Xtigervnc disables remote X11 TCP listening by default for security, operating via Unix domain sockets. Because port 6001 was not listening on TCP, the wrapper assumed failure.
- **Resolution**: Supervised `Xtigervnc` directly with arguments:
  `Xtigervnc :1 -geometry 1280x800 -depth 24 -rfbport 5901 -SecurityTypes None -localhost`
  This starts up in under 50ms without wrapper timeouts.

### Issue 3: noVNC Index Fallback
- **Symptom**: Accessing the root path `/` of WebSockify initially returned a standard directory listing instead of the desktop.
- **Resolution**: Symlinked `/usr/share/novnc/vnc.html` to `/usr/share/novnc/index.html`. Both `/` and `/vnc.html` immediately serve the full noVNC client.

---

## 4. Verification & Testing Evidence
1. **Local Ports Verified**:
   - `5901`: Xtigervnc RFB listening on `127.0.0.1:5901`
   - `6080`: WebSockify listening on `0.0.0.0:6080`
2. **HTTP Verification**:
   - `curl -I http://localhost:6080/` -> `HTTP/1.1 200 OK (WebSockify Python/3.11.2)`
3. **Public Edge Tunnel Verification**:
   - `curl -IL https://roland-arrangement-recommend-chassis.trycloudflare.com` -> `HTTP/2 200 OK`
   - `curl -s -o /dev/null -w "%{http_code}\n" https://roland-arrangement-recommend-chassis.trycloudflare.com/vnc.html` -> `200`
