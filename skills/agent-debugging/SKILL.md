---
skill: agent-debugging
version: 3.0.0
purpose: Scientific debugging. Evidence > guessing.
applies_to: all agents
trigger:
  - bug
  - error
  - failing test
  - regression
  - unexpected behavior
---

# Agent Debugging

## Rules

- Never guess.
- Never patch first.
- Evidence > assumptions.
- Small test > big fix.
- Root cause > symptom.
- Minimal fix.
- Verify after fix.

---

# Phase 0 — Observe

Collect facts only.

```text
Expected:
Actual:
Reproduce:
Errors:
Recent Changes:
Scope:
```

No assumptions.

---

# Phase 1 — Hypotheses

Generate **2–5** different hypotheses.

Each:

- Different layer.
- Falsifiable.
- Cause → Effect.

Example layers:

- State
- Logic
- UI
- API
- Network
- Render
- Config
- Environment
- Integration
- Timing

Rank:

- Likelihood
- Test Cost

```text
H1
Cause:
Likelihood:
Test Cost:

H2
...

H3
...
```

---

# Phase 2 — Tests

For each hypothesis:

```text
Confirms:
Rules Out:
Test:
```

Tests must be:

- Cheap
- Small
- Independent

Never fix during testing.

---

# Phase 2.5 — Instrument

If evidence weak:

Add temporary diagnostics.

Allowed:

- console.log
- console.warn
- console.error
- console.group
- assertions
- timers
- stack traces
- state snapshots
- network logs

Bad:

```ts
console.log("test")
console.log(variable)
```

Good:

```ts
console.group("[Debug]")

console.log("Current State:", state)
console.log("Layout ID:", layoutId)
console.log("Motion Value:", x.get())

console.groupEnd()
```

Every log must explain something.

If root cause still unknown:

Return instrumented code.

Ask user for:

- Console output
- Stack trace
- Network logs
- Browser
- OS
- Framework version
- Screen recording (if visual)

Wait for evidence.

Do not guess.

---

# Phase 3 — Investigate

Run tests.

```text
H1: Confirmed | Rejected | Unknown

Evidence:

H2...

H3...
```

If one confirmed:

Stop.

If multiple survive:

Create another hypothesis.

Never ignore conflicting evidence.

---

# Phase 4 — Root Cause

Answer:

```text
Why happened?

Why not prevented?

Why not detected?

Exists elsewhere?

Simpler explanation?
```

Unknown?

Keep investigating.

---

# Phase 5 — Fix

Smallest fix only.

```text
Root Cause:

Evidence:

Fix:

Risk:

Affected:

Unaffected:
```

Commit only if:

> Fixing **[root cause]** confirmed by **[evidence]**.

No unrelated refactors.

---

# Phase 6 — Verify

Confirm:

- Bug gone
- Reproduction passes
- No regressions
- Tests pass
- No new warnings

Fail?

Return to Phase 1.

---

# Anti-Patterns

❌ Guess fix

❌ Fix before evidence

❌ Confirmation bias

❌ Symptom fix

❌ Multiple fixes at once

❌ Unrelated refactor

❌ Skip verification

❌ "Works on my machine"

---

# Done

Done only when:

- Root cause known
- Evidence collected
- Minimal fix applied
- Verification passed
- Debug logs removed
