---
name: "pty-runner"
description: "Spawns terminal commands, TUIs (Bubbletea, ncurses, agy), and interactive CLI programs inside a genuine Linux pseudo-terminal (PTY) with configurable window geometry."
---

# PTY Runner Plugin

This plugin runs commands inside an authentic Linux pseudo-terminal (`/dev/pts`), providing interactive terminal features, ANSI control sequences, and proper PTY ioctl window resizing for TUIs and terminal clients.

# Capabilities & Architecture

- **Core Script**: `plugins/pty-runner/pty_runner.py`
- **Features**:
  - Full `/dev/tty` allocation for curses/Bubbletea apps.
  - Configurable window dimensions (`--rows`, `--cols`).
  - Signal propagation (SIGINT, SIGWINCH).
  - Terminal raw mode pass-through.

# Usage & Examples

### Launch Interactive TUI or Tool
```bash
python3 plugins/pty-runner/pty_runner.py --cols 120 --rows 30 agy
```

### Run Shell Command with PTY Support
```bash
python3 plugins/pty-runner/pty_runner.py /bin/bash -c "npm test"
```
