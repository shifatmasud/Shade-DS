# Tech Spec 

1. **Objective**
   - **Problem Statement**: Enabling a graphical desktop workspace accessible from any standard web browser within an AI Studio container requires orchestrating multiple interdependent daemon layers (X11 server, window manager, VNC server, WebSocket proxy, and reverse tunnel) while overcoming headless environment challenges (conffile prompts, wrapper timeouts, port bindings).
   - **Solution Overview**: Construct a standardized, reusable agent skill (`browser-desktop`) conforming to Custom Skill Creation Protocols (`/skills/browser-desktop/SKILL.md`) with valid YAML frontmatter, H1-delimited operational phases, automated non-interactive dependency resolution, and lifecycle scripting.
   - **Scope**: Skill definition file (`/skills/browser-desktop/SKILL.md`), mirrored documentation in `/framer/test/SKILL.md`, and integration lifecycle scripts in `/framer/test/`.
   - **Context**: Enables any future agent or user session to instantiate a full XFCE desktop session accessible via HTTPS/WSS in seconds with a single execution or skill activation.

2. **Success Criteria**
   - **Key Results**:
     - Custom skill file exists at `/skills/browser-desktop/SKILL.md`.
     - Skill adheres to Custom Skill Creation Protocols (YAML frontmatter with `name` and `description`, H1-delimited section headers).
     - Covers the entire end-to-end stack: Debian/Ubuntu non-interactive apt setup, `Xtigervnc` execution without wrapper timeouts, `xfce4-session` initialization, `websockify` configuration, and `cloudflared` edge tunneling.
     - Includes troubleshooting playbooks for headless debconf prompts, TCP port detection nuances, and websocket proxy routing.
   - **Non-Negotiables & Criteria**:
     - Zero new icon library dependencies.
     - Exact compliance with AGENTS.md and Custom Skill Creation Protocols.
     - Plan gated and documented prior to file creation.

3. **Project Requirements**
   - [x] Create technical plan in `/plans/browser_desktop_skill_tech_spec.md`.
   - [ ] Author `/skills/browser-desktop/SKILL.md` with complete architecture, commands, configuration snippets, and RCA resolution playbooks.
   - [ ] Mirror operational artifacts into `/framer/test/` for fast evaluation and testing.
   - [ ] Validate syntax and verify execution readiness.

4. **Architecture Decisions**
   - **Trade-off 1: Direct `Xtigervnc` vs `vncserver` Perl Wrapper**:
     - *Decision*: Instruct agents to invoke `Xtigervnc` directly rather than `/usr/bin/vncserver`.
     - *Rationale*: The perl wrapper polls for TCP port `6000 + N` which is disabled in modern Xorg/TigerVNC for security, causing false 30-second timeouts. Direct invocation starts in <50ms with zero timeout risks.
   - **Trade-off 2: Non-Interactive DPKG Flags**:
     - *Decision*: Enforce `DEBIAN_FRONTEND=noninteractive` and `-o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold"`.
     - *Rationale*: Prevents headless subshells from hanging indefinitely on modified config files such as `fontconfig` or `mime.types`.
   - **Trade-off 3: WebSockify Built-in Web Server**:
     - *Decision*: Utilize `websockify --web=/usr/share/novnc 6080 localhost:5901` directly instead of separate Nginx + websockify.
     - *Rationale*: Minimizes resource footprint and daemon complexity, serving static noVNC HTML/JS assets and WebSocket bridging in a single lightweight process.

5. **Pseudo Code** (Written in Shade DSL)
```dsl
SkillDefinition BrowserDesktopSkill {
  Meta: {
    name: "browser-desktop",
    type: "AgentSkill",
    target: "/skills/browser-desktop/SKILL.md"
  },
  Data: {
    packages: ["tigervnc-standalone-server", "novnc", "websockify", "xfce4", "xfce4-terminal", "dbus-x11"],
    ports: {
      vnc: 5901,
      novnc: 6080,
      display: ":1"
    },
    tunnel: "cloudflared"
  },
  Logic: {
    Step1: InstallDependencies(nonInteractive=true),
    Step2: CleanLocksAndInitializeDisplay(display=":1"),
    Step3: LaunchDirectXtigervnc(port=5901, localhostOnly=true),
    Step4: LaunchDesktopSession(session="xfce4-session"),
    Step5: LaunchWebSockifyGateway(webRoot="/usr/share/novnc", port=6080, target=5901),
    Step6: EstablishCloudflareTunnel(targetPort=6080, protocol="http2"),
    Step7: ExtractAndFormatShareableURL(params="?autoconnect=true&resize=remote")
  },
  Render: {
    Output: LiveShareableURL
  }
}
```
