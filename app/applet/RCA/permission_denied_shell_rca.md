# Root Cause Analysis (RCA): Shell Daemon "Permission denied" Failure

## 1. Incident Overview
- **Symptom**: `[Shell.online] Spawning fresh daemon...` resulted in `/bin/sh: 1: /app/applet/bin/shell: Permission denied`.
- **Impact**: Non-interactive shell daemon spawned by `Shell.online` failed instantly upon invocation, preventing background shell daemon initialization and terminal sharing.
- **Affected Binary**: `/app/applet/bin/shell` (and other un-flagged binaries in `/app/applet/bin/`).

## 2. Root Cause
- **File Mode Lack of Executable Bit**: File `/app/applet/bin/shell` had file mode permissions set to `-rw-r--r--` (`0644`).
- **Mechanism**: When `/bin/sh` or a process attempted to execute `/app/applet/bin/shell`, the Linux kernel `execve` syscall returned `EACCES` ("Permission denied") because POSIX execute permissions (`+x` / `0755`) were missing on the file.
- **Origin**: Binary files extracted or cloned into the repository workspace retained default non-executable file permissions (`644`).

## 3. Immediate Resolution
1. **Permission Audit & Update**:
   Applied POSIX executable file mode bits across binaries and scripts:
   ```bash
   chmod +x bin/* scripts/*.sh scripts/*.py
   ```
2. **Verification**:
   Executed `/app/applet/bin/shell --help` directly in the shell environment.
   - Result: Successful launch displaying `shell.online — your terminal, open in any browser` (Exit Code 0).

## 4. Remediation & Preventive Actions
- **Permissions Integrity**: All CLI binaries (`shell`, `gws`, `cld`, `openmail`, `agy`) and execution scripts (`desktop_service.sh`, `pty_runner.py`) are configured with `0755` (`-rwxr-xr-x`).
- **Future Integrity**: Ensure any new CLI binaries or daemon scripts placed in `bin/` or `scripts/` retain executable permissions.
