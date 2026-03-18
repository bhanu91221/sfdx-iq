---
description: Run LWC Jest tests with coverage reporting
---

# /lwc-test

Run Lightning Web Component Jest tests, parse results, and report per-component pass/fail status with coverage metrics.

## Workflow

1. **Validate environment**
   - Confirm `package.json` exists in the project root
   - Check that `@salesforce/sfdx-lwc-jest` or `@lwc/jest-preset` is listed in `devDependencies`
   - If Jest is not installed, instruct the user to run `sf force lightning lwc test setup` or `npm install`
   - Verify `jest.config.js` or a `jest` key in `package.json` exists

2. **Determine test scope**
   - If a component name is provided, run tests only for that component
   - If a directory is provided, run tests for all components under that directory
   - If no argument is given, run all LWC tests in the project

3. **Execute tests**
   - Build the command based on scope:
     - All tests: `npx lwc-jest --coverage` or `npm run test:unit -- --coverage`
     - Specific component: `npx lwc-jest --coverage -- --testPathPattern="<componentName>"`
   - If the user provides `--watch`, append `--watch` to the command
   - Run the command and capture stdout and stderr

4. **Parse results**
   - Extract from Jest output:
     - Total test suites: passed, failed, total
     - Total tests: passed, failed, skipped, total
     - Per-suite breakdown: suite name, pass/fail status, duration
     - For failures: test name, expected vs received, stack trace location
   - Extract coverage data if `--coverage` is enabled:
     - Per-component: statements, branches, functions, lines percentages
     - Identify components below 80% coverage threshold

5. **Report results**
   - Display summary table: total suites, total tests, pass rate, execution time
   - If all tests pass: show green summary with coverage highlights
   - If tests fail: for each failing suite, show:
     - Component name
     - Failing test name and description
     - Expected vs actual values
     - File path and line number of the assertion
     - Suggested fix based on common LWC test patterns
   - Display coverage table sorted by coverage percentage (lowest first)
   - Flag any component below 80% coverage as needing attention

6. **Suggest improvements**
   - For uncovered components, suggest test scenarios based on the component code
   - For common failures (wire adapter mocking, DOM queries), provide fix patterns
   - Recommend missing test categories: positive, negative, bulk, accessibility

## Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--component` | Test a specific component by name | All components |
| `--watch` | Run in watch mode for development | `false` |
| `--coverage` | Generate coverage report | `true` |
| `--verbose` | Show detailed output per test | `false` |

## Error Handling

- If Jest is not installed, provide the exact installation command
- If no test files are found, check for `__tests__` directories and suggest creating test files
- If node_modules is missing, prompt user to run `npm install`
- If tests timeout, suggest increasing Jest timeout or checking for async issues
- If `@salesforce` module mocks fail, verify Jest config has the correct moduleNameMapper

## Example Usage

```
/lwc-test
/lwc-test --component accountList
/lwc-test --watch --component contactForm
/lwc-test --verbose --coverage
```
