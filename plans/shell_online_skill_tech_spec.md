# Tech Spec: Shell Online Skill Integration

1. **Objective**
   Create a new skill for `shell.online`, a terminal sharing and coding agent tool. This includes installing the binary, documenting its usage, and verifying it works.

2. **Success Criteria**
   - `shell.online` binary installed in `./bin/shell`.
   - `/skills/shell-online/SKILL.md` created with usage instructions.
   - Successful execution of `shell --version`.
   - Successful execution of `shell help`.

3. **Project Requirements**
   - [ ] Download and inspect `shell.online` install script (done).
   - [ ] Install `shell` binary into `./bin`.
   - [ ] Create `/skills/shell-online/SKILL.md`.
   - [ ] Add `shell` to `README.md` changelog.
   - [ ] Verify installation with tests.

4. **Architecture Decisions**
   - Use `./bin/shell` as the binary location (as per `cli-installer` skill).
   - Use the environment variable `SHELL_ONLINE_INSTALL_DIR` to control the installation path.
   - Document the tool as a "coding agent sharing" utility.

5. **Pseudo Code**
   ```bash
   # Install
   export SHELL_ONLINE_INSTALL_DIR=./bin
   curl -fsSL https://shell.online/install | sh
   
   # Verify
   ./bin/shell --version
   ```
