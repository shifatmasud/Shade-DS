---
name: "decompile-jsx"
description: "Decompiles transpiled React JSX/JS runtime calls (_jsx, _jsxs, React.createElement) back into clean JSX and AST syntax using Recast and Babel parser."
---

# Decompile JSX Plugin

This plugin provides AST-level transformation tools to revert compiled JSX runtime calls (`_jsx`, `_jsxs`, and `React.createElement`) into human-readable JSX/TSX syntax.

# Capabilities & Architecture

- **Engine**: Built with `recast`, `@babel/parser`, and `@babel/types`.
- **Preservation**: Preserves source code formatting, comments, and non-JSX code while converting compiler artifacts back to standard JSX trees.
- **Entry point**: `plugins/decompile-jsx/decompile-jsx.cjs`.

# Usage & Examples

### Basic Conversion
Run the decompiler providing an input file and target output file:
```bash
node plugins/decompile-jsx/decompile-jsx.cjs path/to/compiled.js path/to/output.tsx
```

### Batch Automation
Decompile multiple bundled files programmatically:
```bash
for file in build/*.js; do
  node plugins/decompile-jsx/decompile-jsx.cjs "$file" "decompiled/$(basename "$file" .js).tsx"
done
```
