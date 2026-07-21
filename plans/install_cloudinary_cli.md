# PRD: Cloudinary CLI Installation

## Overview & Objectives
The goal is to install the Cloudinary CLI into the workspace to allow programmatic management of media assets. The installation must be persistent and accessible via the `./bin/cloudinary` path, adhering to the `cli-installer` skill guidelines.

## Success Criteria (OKR)
- [ ] `python3` and `pip3` are verified as available.
- [ ] Cloudinary CLI is installed in a persistent location within the workspace.
- [ ] A `cloudinary` executable exists in `./bin/` that correctly invokes the CLI.
- [ ] `CLOUDINARY_URL` is configured in the environment.
- [ ] Running `./bin/cloudinary config` returns the correct configuration.

## Architectural Design (ADR)
Since the Cloudinary CLI is a Python-based tool and the environment constraints require persistence in `./bin`, we will:
1. Use `venv` to create a localized Python environment within the workspace (e.g., `./bin/.cloudinary_venv`).
2. Install `cloudinary-cli` into this virtual environment.
3. Create a wrapper script at `./bin/cloudinary` that activates the venv and runs the command, or directly points to the venv's python interpreter.
4. Update `.env` and `.env.example` with the provided `CLOUDINARY_URL`.

## TODO
- [ ] Verify `python3` and `pip3` availability.
- [ ] Create virtual environment in `./bin/.cloudinary_venv`.
- [ ] Install `cloudinary-cli` using pip within the venv.
- [ ] Create the `./bin/cloudinary` wrapper script.
- [ ] Set execution permissions for the wrapper.
- [ ] Add `CLOUDINARY_URL` to `.env` and `.env.example`.
- [ ] Verify installation by running `./bin/cloudinary config`.
