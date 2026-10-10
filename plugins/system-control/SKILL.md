---
name: "system-control"
description: "Windows host environment system maintenance script for RAM cleanup, Windows Update state toggling, browser cache clearance, and logon startup task automation."
---

# System Control Plugin

This plugin provides host-level Windows maintenance automation script for memory optimization, background service management, and startup scheduling.

# Capabilities & Architecture

- **Core Script**: `plugins/system-control/System_Control.bat`
- **Features**:
  - Memory & RAM working set cache cleaning.
  - Windows Update service disable/enable toggles.
  - Microsoft Edge browser cache purge.
  - Windows Task Scheduler integration for automatic logon runs.

# Usage & Examples

### Interactive Menu
Execute directly in administrative shell:
```bat
plugins\system-control\System_Control.bat
```

### Silent Auto-Startup Mode
```bat
plugins\system-control\System_Control.bat --startup
```
