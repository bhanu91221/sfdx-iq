---
description: Generate Batch Apex boilerplate with scheduler and test class
---

# /scaffold-batch

Generate a complete Batch Apex implementation: the batch class with start/execute/finish methods, a companion Schedulable class, and a comprehensive test class with 200+ record testing.

## Workflow

0. **Load context** — Invoke the context-assigner agent with the description of this scaffolding task. Display the announcement block (loaded skills, rules, token count) to the user before proceeding.

1. **Gather requirements**
   - Ask for the SObject to process (e.g., `Account`, `Lead`, `Custom_Object__c`)
   - Ask for the processing logic description (what the batch should do)
   - Ask for the batch scope size (default: 200)
   - Ask if the batch needs:
     - Callouts (`Database.AllowsCallouts`)
     - Stateful tracking (`Database.Stateful`)
     - Chaining to another batch in `finish()`
   - Ask for the schedule frequency if scheduling is needed (daily, weekly, hourly)

2. **Generate the batch class**
   - File: `<BatchName>Batch.cls`
   - Meta file: `<BatchName>Batch.cls-meta.xml`
   - Class declaration implements `Database.Batchable<SObject>` plus optional interfaces
   - If `Database.Stateful`: include instance variables for tracking (e.g., `totalProcessed`, `totalErrors`, `errorMessages`)
   - **start() method**:
     - Return a `Database.QueryLocator` with the SOQL query
     - Query must use `WITH SECURITY_ENFORCED`
     - Include all fields needed by `execute()` in the SELECT clause
     - Add WHERE clause to filter records needing processing
     - Add comments explaining the query scope
   - **execute() method**:
     - Accept `List<SObject>` scope parameter
     - Process records in a bulkified manner — no SOQL or DML inside loops
     - Collect records to update/insert in a list, perform single DML at the end
     - Use `Database.update(records, false)` for partial success handling
     - Iterate `Database.SaveResult` to log errors
     - If `Stateful`: update tracking counters
   - **finish() method**:
     - Send completion notification via email or custom notification
     - Log results to a custom object or platform event if needed
     - If chaining: enqueue the next batch with `Database.executeBatch()`
     - Include summary: records processed, errors encountered, duration

3. **Generate the scheduler class**
   - File: `<BatchName>Scheduler.cls`
   - Meta file: `<BatchName>Scheduler.cls-meta.xml`
   - Implements `Schedulable`
   - `execute(SchedulableContext sc)` method calls `Database.executeBatch(new <BatchName>Batch(), <scopeSize>)`
   - Include a static `schedule()` convenience method with the cron expression
   - Include common cron expressions as comments:
     - Daily at midnight: `0 0 0 * * ?`
     - Weekdays at 6 AM: `0 0 6 ? * MON-FRI`
     - Every hour: `0 0 * * * ?`
   - Include a static `scheduleJob()` method that returns the job ID

4. **Generate the test class**
   - File: `<BatchName>BatchTest.cls`
   - Meta file: `<BatchName>BatchTest.cls-meta.xml`
   - `@isTest` annotation
   - **@TestSetup method**:
     - Create 200+ records that match the batch query criteria
     - Create some records that should NOT match (to verify filtering)
     - Use `TestDataFactory` if available
   - **testBatchExecution()**:
     - Call `Database.executeBatch()` between `Test.startTest()` and `Test.stopTest()`
     - After `Test.stopTest()`, query records and verify processing occurred
     - Assert expected field values changed
     - Assert record count matches expectations
   - **testBatchWithErrors()**:
     - Create records that will cause processing errors (e.g., validation rule failures)
     - Verify partial success behavior
     - If `Stateful`: verify error counters
   - **testBatchEmptyScope()**:
     - Run batch with no matching records
     - Verify graceful handling — no errors
   - **testScheduler()**:
     - Schedule the batch using the scheduler class
     - Verify `CronTrigger` is created with correct cron expression
     - Use `System.schedule()` between `Test.startTest()` and `Test.stopTest()`
   - **testBatchScope()**:
     - Verify the batch processes exactly the expected records
     - Confirm records outside the query filter are untouched

5. **Apply best practices**
   - Use `with sharing` on the batch class
   - Never exceed 50 million records in the QueryLocator
   - Log all errors — do not silently swallow exceptions
   - Use `Database.update` with `allOrNone=false` for partial processing
   - Include ApexDoc on all classes and methods
   - Set reasonable scope size (200 default, smaller for callout batches)

6. **Create Apex Classes**
   - Salesforce Cli Command `sf apex generate class --name <myClass> --output-dir force-app/main/default/classes`
   - Verify `.cls` and `.cls-meta.xml` for both class and test class
   - Report all created files

## Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--name` | Batch class name (without `Batch` suffix) | Prompt user |
| `--object` | SObject to process | Prompt user |
| `--scope` | Batch scope size | `200` |
| `--stateful` | Include Database.Stateful | `false` |
| `--callouts` | Include Database.AllowsCallouts | `false` |
| `--schedule` | Cron expression for scheduling | None |
| `--output-dir` | Output directory | `force-app/main/default/classes` |

## Error Handling

- If the batch class name already exists, ask whether to overwrite or rename
- If the object name is invalid, warn and proceed with a placeholder query
- If scope size exceeds 2000, warn about governor limits with callouts
- If `callouts` is enabled, enforce scope size of 100 or less and add callout limit comments

## Example Usage

```
/scaffold-batch
/scaffold-batch --name LeadCleanup --object Lead --scope 200
/scaffold-batch --name AccountSync --object Account --stateful --callouts --scope 50
/scaffold-batch --name CaseArchive --object Case --schedule "0 0 0 * * ?"
```
