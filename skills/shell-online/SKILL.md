# Shell.online Skill

This skill enables the agent to share a terminal session with the user via a secure, browser-based interface provided by `shell.online` using the binary at `/bin/shell`.

## Core Features
- **Zero-Config Sharing**: Instantly expose a local terminal or process to the web.
- **End-to-End Encryption**: All traffic is encrypted between the machine and the browser.
- **Interactive & Read-Only Modes**: Choose whether the user can type or just watch.
- **Background Processes**: Keeps running even if the browser is closed.

## Command Reference

### Start a Shared Session
To share a specific command:
```bash
./bin/shell <command>
```
To share the current shell (interactive):
```bash
./bin/shell
```
To share a development server (e.g., Vite):
```bash
./bin/shell -- npm run dev
```

### Management Commands
- **List sessions**: `./bin/shell list`
- **Show session password**: `./bin/shell password <ID>`
- **Stop a session**: `./bin/shell kill -- <ID>`
- **Rejoin a session locally**: `./bin/shell attach <ID>`

## Usage Guidelines
1. **Security First**: Always inform the user when sharing a session and provide the URL and password clearly.
2. **Persistence**: Use `--persistent <state-file>` if you need the same URL to survive restarts.
3. **Backgrounding**: By default, `./bin/shell <command>` runs in the background. Use `--foreground` if you want to stay attached in the current terminal.
4. **Permissions**: Use `--read-only` if you want to prevent user input in the shared terminal.

## Installation Note
The binary is located at `/bin/shell`. It is a standalone binary that does not require additional dependencies.
