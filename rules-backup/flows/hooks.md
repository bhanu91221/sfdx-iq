---
paths:
  - "**/*.flow"
  - "**/*.flow-meta.xml"
  - "**/flows/**"
---

# Flow Hook Rules

## Post-Edit Flow Checks

When a `.flow-meta.xml` file is edited, the `flow-check.js` hook scans for violations:

### Checks Performed

| Check | Severity | Description |
|-------|----------|-------------|
| DML in loop | CRITICAL | Create/Update/Delete elements inside Loop elements |
| Get Records in loop | HIGH | Get Records elements inside Loop elements |
| Missing fault connector | HIGH | DML or callout elements without fault paths |
| Missing flow description | MEDIUM | Flow definition has no description |
| Missing element description | LOW | Individual elements lack descriptions |

### Detection Method

The hook parses flow XML and checks:
1. **Loop detection**: Finds `<loops>` elements, then checks if any `<recordCreates>`, `<recordUpdates>`, `<recordDeletes>`, or `<recordLookups>` reference elements within the loop's `nextValueConnector` chain.
2. **Fault paths**: Checks that `<recordCreates>`, `<recordUpdates>`, `<recordDeletes>`, and `<actionCalls>` elements have a `<faultConnector>` child element.
3. **Descriptions**: Checks for `<description>` elements on the flow and individual elements.

## Hook Behavior by Profile

| Check | Minimal | Standard | Strict |
|-------|---------|----------|--------|
| DML in loop | ✅ | ✅ | ✅ |
| Get Records in loop | ❌ | ✅ | ✅ |
| Missing fault connector | ❌ | ✅ | ✅ |
| Missing flow description | ❌ | ❌ | ✅ |
| Missing element descriptions | ❌ | ❌ | ✅ |

## When to Invoke flow-analyst Agent

The hook automatically suggests the `flow-analyst` agent when:
- A CRITICAL finding is detected (DML in loop)
- More than 3 findings in a single flow
- Flow has >20 elements (complexity warning)

## Limitations

- Flow XML analysis is structural — it cannot detect all runtime bulkification issues.
- Some flow element connections are indirect (via scheduled paths, subflows) and may not be caught.
- For comprehensive flow analysis, use the `/flow-review` command which delegates to the `flow-analyst` agent.
