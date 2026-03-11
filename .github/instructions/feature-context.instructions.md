---
description: "Convention for creating feature context files (.context.md) to protect existing functionality when iterating on complex components."
applyTo: "**/*.tsx, **/*.ts"
---

# Feature Context Files

## Why They Exist

Powerful LLMs (Claude Sonnet, GPT o3-Codex) frequently delete or break **existing** interactive behaviors when asked to add a **new** feature to a complex component. This is not a rare edge case — it happens consistently with:

- Timeline editors (drag + click + keyboard + undo/redo)
- Multi-step forms (validation state + navigation + conditional fields)
- Data tables (sorting + filtering + pagination + row selection)
- Rich text editors (formatting commands + selection state + history)
- Any component with >3 distinct user interaction paths

A `.context.md` file co-located with the component acts as a **contract**. The model reads it before touching the file and confirms all listed invariants still hold after the change.

## When to Create One

Create a `.context.md` file when **all three** of the following are true:

1. The component has **3 or more distinct interactive behaviors** (not counting basic click)
2. The component is **>~300 lines** of code, OR has had regressions introduced before
3. You expect to make **further changes** to the component in the future

A single-use modal or a stateless display component does not need a context file.

## File Naming and Location

Co-locate the context file next to the component it describes:

```
app/dashboard/timeline.tsx
app/dashboard/timeline.context.md   ← here
```

For page-level context (when a page has complex orchestration):

```
app/dashboard/page.tsx
app/dashboard/page.context.md
```

## Required Sections

Every `.context.md` must have these sections:

```markdown
# [Component Name] — Feature Context

## Purpose

One sentence describing what this component does and why it exists.

## User Interactions (Invariants)

List every behavior the user can trigger. These MUST NOT be broken by any future change.

- [ ] Clicking anywhere on the timeline moves the playhead to that position
- [ ] Dragging the timeline scrolls left/right without moving the playhead
- [ ] Pressing Space toggles play/pause
- [ ] Pressing Ctrl+Z undoes the last trim operation
- [ ] Pressing Delete removes the selected clip
- [ ] Double-clicking a clip opens the clip properties panel

## State Shape

Describe the key pieces of state and what triggers changes to each:

| State field      | Type      | Triggers a change when…                   |
| ---------------- | --------- | ----------------------------------------- |
| `currentTime`    | `number`  | User clicks timeline or playback advances |
| `selectedClipId` | `string?` | User clicks a clip or presses Escape      |
| `zoom`           | `number`  | User scrolls with Ctrl+wheel              |

## Known Edge Cases

- Seeking while playing must not reset the playhead to 0 after the seek completes
- Deleting the last clip must leave the timeline empty, not in an error state
- Zoom level must be clamped between 0.25× and 8×

## Change Log

| Date       | Change summary       | Author |
| ---------- | -------------------- | ------ |
| 2026-03-11 | Created context file | @you   |
```

## How to Use This File in Prompts

**Before requesting any change:** tag the context file explicitly

```
Read `timeline.context.md` first.
Do not break any behavior listed under "User Interactions".
Then implement: [your feature request here].
After implementing, confirm that each invariant in "User Interactions" still works as described.
```

**After the change is made:** ask for a confirmation pass

```
Check each item in the "User Interactions" section of `timeline.context.md`.
For each one, explain how the current code satisfies it.
If any invariant is broken, fix it before stopping.
```

**When adding a new behavior:** update the context file as part of the same PR

1. Add the new behavior to the **User Interactions** list
2. Update **State Shape** if new state fields were introduced
3. Add a **Change Log** entry

## Generating a Context File with AI

Use the `.github/prompts/generate-feature-docs.prompt.md` prompt to generate an initial `.context.md` from an existing component:

```
Read `timeline.tsx` completely.
Generate a `timeline.context.md` following the template in `feature-context.instructions.md`.
List every user interaction you can find in the event handlers and effects.
Be exhaustive — missing an invariant defeats the purpose.
```

Review the output carefully before committing — the model may miss behaviors that happen implicitly (e.g., effects that reset state, keyboard shortcuts defined elsewhere).

## Relationship to Other Files

| File                                                 | Relationship                                                            |
| ---------------------------------------------------- | ----------------------------------------------------------------------- |
| `.github/copilot-instructions.md`                    | Documents the anti-regression pitfall (Pitfall #10) that motivates this |
| `.github/prompts/generate-feature-docs.prompt.md`    | Prompt for auto-generating context files from existing code             |
| `.github/prompts/modify-complex-component.prompt.md` | Prompt for safely changing a component with a context file              |
| `.agents/skills/context-map/SKILL.md`                | Broader skill for mapping all files relevant to a task                  |

## Learnings
