---
description: Run Apex tests with coverage analysis
---

# /test

Run Apex tests in the target org and produce a detailed coverage report.

## Workflow

1. **Identify test classes**
   - If `--class-names` is provided, use those specific classes
   - If `--suite-names` is provided, run those test suites
   - Otherwise, discover all test classes matching the convention `*Test.cls` in the source directory
   - Warn if no test classes are found

2. **Execute tests**
   - Run: `sf apex run test --code-coverage --result-format human --wait 10`
   - If `--synchronous` flag is set, add `--synchronous`
   - If specific classes: add `--class-names <comma-separated>`
   - If test suites: add `--suite-names <comma-separated>`

3. **Parse results**
   - Extract pass/fail counts per test method
   - Extract code coverage percentages per Apex class
   - Calculate overall org-wide coverage

4. **Generate report**
   - **Summary**: total tests, passed, failed, execution time
   - **Failures**: for each failing test, show class, method, error message, and stack trace
   - **Coverage**: table of classes with coverage percentage
   - **Below threshold**: highlight any class below 75% coverage in a warning section
   - **Org coverage**: show overall org coverage and whether it meets the 75% deployment minimum

5. **Recommendations**
   - For classes below 75%: suggest which methods lack coverage
   - For failing tests: provide guidance on common failure patterns
   - If org coverage is below 75%: warn that production deployments will fail

## Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--class-names` | Comma-separated test class names | All test classes |
| `--suite-names` | Comma-separated test suite names | None |
| `--synchronous` | Run tests synchronously | `false` |
| `--target-org` | Org alias or username | Default org |

## Error Handling

- If test run times out, provide the test run ID and `sf apex get test` command
- If no test classes are found, suggest creating tests or checking naming conventions
- If org authentication fails, prompt for re-authentication

## Example Usage

```
/test
/test --class-names AccountServiceTest,ContactTriggerTest
/test --suite-names CoreTests --synchronous
```
