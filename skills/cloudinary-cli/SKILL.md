---
name: cloudinary-cli
description: Guidelines for using the Cloudinary CLI (cld) to manage media assets.
---

# Cloudinary CLI Skill

The Cloudinary CLI (`cld`) is installed in `./bin/cld` and requires a Python 3 environment.

## Setup

Ensure `CLOUDINARY_URL` is set in your environment variables.

## Common Commands

### Upload a file
```bash
./bin/cld upload path/to/file.png
```

### Search for assets
```bash
./bin/cld search "expression"
```

### Admin API calls
```bash
./bin/cld admin resources
```

## Troubleshooting

- If `cld` is not found, ensure you are referencing `./bin/cld`.
- If Python errors occur, verify that `python3` is available in the container.
