---
name: shell-online
description: Guidelines for installing and using the shell.online CLI tool to create shareable background terminal sessions.
---

# Shell Online Skill

This skill provides instructions for integrating `shell.online` into the AI Studio environment, allowing long-running tasks to be executed in the background and shared via a web-based terminal.

## Installation

The `shell` tool should be installed into the root `./bin` directory to ensure persistence.

```bash
# 1. Download the installer
curl -fsSL https://shell.online/install -o shell_install.sh

# 2. Run the installer with the target directory
export SHELL_ONLINE_INSTALL_DIR=$(pwd)/bin
bash shell_install.sh

# 3. Cleanup
rm shell_install.sh
```

## Usage

### Starting a Background Session
To run a command in the background and generate a shareable link:

```bash
# Ensure bin is in PATH
export PATH="$(pwd)/bin:$PATH"

# Run the command
shell <command>
```

### Accessing the Session
The `shell` command will output:
1.  **Open**: A browser link to access the terminal.
2.  **Password**: A one-time password for the session.
3.  **Rejoin**: A command to attach to the session from the CLI (`shell attach <id>`).

## Best Practices

- **Persistence**: Always install to `./bin`.
- **Permissions**: If a command fails to start, ensure the binary in `./bin` has executable permissions (`chmod +x bin/<binary>`).
- **Pathing**: Always prepend `$(pwd)/bin` to `PATH` before running `shell` to ensure it can find both itself and local binaries (like `agy`).
- **Security**: The generated link and password should be treated as sensitive if the session contains private data.

## Troubleshooting

### "executable file not found in $PATH"
If `shell` cannot find the command you are trying to run:
1. Verify the command exists in `./bin`.
2. Ensure you exported the updated `PATH`.
3. Check permissions: `ls -l bin/` and `chmod +x bin/*`.
