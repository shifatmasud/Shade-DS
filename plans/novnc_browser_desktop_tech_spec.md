# Tech Spec

1. **Objective**
   - **Problem Statement**: The user wants to run a shareable browser-based desktop environment using VNC + noVNC + Cloudflare Tunnel directly from the Linux VM/container environment and obtain a live, accessible public URL (`https://xxxxx.trycloudflare.com`).
   - **Solution Overview**: 
     - Install and configure a lightweight desktop environment / window manager (e.g. XFCE4 or Openbox/Fluxbox + Xvfb/TigerVNC for high performance in headless gVisor sandbox).
     - Deploy TigerVNC server listening on `:1` (port `5901`).
     - Configure and start `noVNC` with `websockify` on port `6080` bridging WebSockets to VNC `:5901`.
     - Expose port `6080` via `cloudflared tunnel --url http://localhost:6080 --protocol http2`.
     - Capture the public `.trycloudflare.com` tunnel URL and verify full end-to-end responsiveness.
   - **Scope**: Headless X session + VNC server + noVNC web proxy + Cloudflare tunnel pipeline running as background managed processes inside the environment.
   - **Context**: Running on Debian/Ubuntu under gVisor container (uid=0 root).

2. **Success Criteria**
   - **Key Results**:
     - Desktop environment and VNC server actively running and bound to `:5901`.
     - noVNC web server actively serving UI assets and WebSocket bridge on `:6080`.
     - Cloudflare tunnel connected and producing a valid public `https://<subdomain>.trycloudflare.com` URL.
     - Accessing `https://<subdomain>.trycloudflare.com/vnc.html` loads the desktop interface in any browser without local port forwarding.
   - **Non-Negotiables & Criteria**:
     - Maintain stability within gVisor memory and CPU limits.
     - Passwordless or documented secure access so the user can immediately connect.
     - Document setup steps, commands, and verify running background tasks.

3. **Project Requirements**
   - [x] Download and verify `cloudflared` binary for amd64 Linux.
   - [ ] Install desktop environment (XFCE4/Openbox), X11/TigerVNC, and noVNC/websockify via apt or standalone scripts.
   - [ ] Configure `xstartup` and initialize VNC display `:1` with geometry (e.g. 1280x800).
   - [ ] Launch `websockify` / `novnc_proxy` listening on port `6080` forwarding to `localhost:5901`.
   - [ ] Launch `cloudflared tunnel` targeting `http://localhost:6080`.
   - [ ] Extract and verify public URL from tunnel logs.
   - [ ] Record findings and configuration in RCA / plans.

4. **Architecture Decisions**
   - **Desktop Environment Selection**: Prefer lightweight XFCE4 / Openbox session over heavy GNOME/KDE to conserve container RAM and ensure fast frame encoding over WebSockets.
   - **Tunnel Protocol**: Use `--protocol http2` for `cloudflared` to guarantee stable tunneling in gVisor without requiring UDP/QUIC kernel permissions.
   - **Autostart & Persistence**: Run VNC and noVNC via controlled background process scripts with PID tracking and logging to `/tmp/`.

5. **Pseudo Code**
   ```shade
   data DesktopBridgeState {
     vncPort: 5901,
     noVncPort: 6080,
     display: ":1",
     geometry: "1280x800",
     tunnelUrl: string,
     status: "initializing" | "running" | "failed"
   }

   logic DesktopSupervisor {
     action startVncServer() {
       exec("vncserver :1 -geometry 1280x800 -SecurityTypes None")
     }
     action startNoVnc() {
       exec("novnc_proxy --vnc localhost:5901 --listen 6080 --web /usr/share/novnc")
     }
     action startTunnel() {
       exec("cloudflared tunnel --url http://localhost:6080 --protocol http2")
     }
   }

   render DesktopInterface {
     frame: BrowserView(url: tunnelUrl + "/vnc.html?autoconnect=true&resize=remote")
   }
   ```
