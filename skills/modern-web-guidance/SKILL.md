# Modern Web Guidance

Comprehensive guidance on modern browser APIs, layouts, and performance.

## Usage Instructions

This skill enables the agent to access up-to-date best practices for modern web development using the `modern-web-guidance` tool.

### Step 1: Search Use Cases

When asked to implement a specific UI pattern, animation, or use a modern browser API, search for relevant use cases to find the best approach.

```bash
npx -y modern-web-guidance@latest search "<query>"
```

### Step 2: Retrieve Best Practices

Once a relevant use case ID is identified, retrieve the detailed guidance, implementation steps, and code examples.

```bash
npx -y modern-web-guidance@latest retrieve "<id>"
```

## Guidelines

- **Prefer Native Solutions**: Always prioritize modern CSS (Grid, Flexbox, Container Queries, Anchor Positioning) and built-in Browser APIs over external libraries.
- **Progressive Enhancement**: Implement features such that they work (or fail gracefully) on older browsers using fallbacks.
- **Performance**: Use compositor-friendly animations and minimize main-thread work.
- **Accessibility**: Ensure all implementations follow WCAG standards and provide proper ARIA attributes and keyboard support.
