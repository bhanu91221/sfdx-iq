---
description: Start TDD workflow for Apex or LWC development
---

# /tdd

Guide a strict Test-Driven Development cycle for Salesforce development, supporting both Apex and LWC Jest.

## Workflow

1. **Gather requirements**
   - Ask the user what they want to build (feature, bug fix, refactor)
   - Clarify: is this Apex or LWC?
   - Identify the class/component name and expected behavior

2. **Write tests FIRST (RED phase)**
   - Delegate to the **test-guide** agent
   - **For Apex**: create a test class with `@IsTest` annotation, `@TestSetup` for data, and test methods covering:
     - Positive scenarios (happy path)
     - Negative scenarios (error conditions)
     - Bulk scenarios (200+ records for trigger context)
     - Permission scenarios (different user profiles)
   - **For LWC**: create a Jest test file with:
     - Component rendering tests
     - Wire adapter mock tests
     - User interaction tests
     - Event handling tests
   - Run the tests — they MUST fail (RED). If any pass, the test is not testing new behavior.

3. **Write minimum implementation (GREEN phase)**
   - Write the smallest amount of code to make all tests pass
   - Do NOT add extra functionality beyond what tests require
   - **For Apex**: follow governor limits best practices, use `with sharing`, use bind variables
   - **For LWC**: follow component lifecycle best practices
   - Run tests — they MUST all pass (GREEN). If any fail, fix the implementation.

4. **Refactor (REFACTOR phase)**
   - Improve code quality without changing behavior
   - Extract methods, improve naming, reduce duplication
   - Run tests after each refactor — they must still pass
   - Delegate to **apex-reviewer** or **lwc-reviewer** agent for quality check

5. **Repeat**
   - Ask: "What's the next behavior to add?"
   - Return to step 2 for each new behavior
   - Continue until the feature is complete

## Agent Delegation

- **test-guide**: drives the TDD cycle, writes test scaffolds
- **apex-reviewer**: reviews Apex code quality during refactor phase
- **lwc-reviewer**: reviews LWC code quality during refactor phase
- **governor-limits-checker**: validates governor limits compliance after implementation

## Rules

- NEVER write implementation before tests
- NEVER skip the RED phase — if tests pass immediately, they are inadequate
- Keep test methods focused on one behavior each
- Use descriptive test method names: `testAccountInsert_bulkRecords_shouldSucceed`
- Minimum 75% coverage, target 90%+

## Example Usage

```
/tdd
> What do you want to build?
> "An Apex trigger handler that rolls up child opportunity amounts to the parent account"
```
