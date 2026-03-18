---
description: Generate Apex class with matching test class by pattern type
---

# /scaffold-apex

Generate an Apex class following a specific design pattern (Service, Selector, Domain, Controller, Batch, Queueable) with a matching test class that meets coverage requirements.

## Workflow

1. **Gather requirements**
   - Ask for the class type / pattern:
     - **Service**: Business logic layer, stateless methods, bulkified operations
     - **Selector**: SOQL query layer, returns SObject lists, enforces FLS
     - **Domain**: Object-specific logic, validation, field defaults, trigger handler delegate
     - **Controller**: Aura/LWC controller with `@AuraEnabled` methods
     - **Batch**: `Database.Batchable` implementation (delegates to `/scaffold-batch` for full scaffold)
     - **Queueable**: `Queueable` implementation with chaining support
     - **Schedulable**: `Schedulable` implementation for scheduled jobs
     - **REST Service**: `@RestResource` annotated class for custom REST endpoints
   - Ask for the class name and the SObject it relates to (if applicable)
   - Ask for a brief description of the class purpose

2. **Generate class based on pattern**

   **Service pattern:**
   - Class name: `<Name>Service.cls`
   - `with sharing` by default
   - Static methods that accept `List<SObject>` parameters for bulkification
   - No DML inside — return records for the caller to commit
   - Separate public interface methods from private helper methods
   - Include custom exception inner class: `<Name>ServiceException`

   **Selector pattern:**
   - Class name: `<Name>Selector.cls`
   - `with sharing` enforced
   - Methods return `List<SObject>` or `Map<Id, SObject>`
   - All queries use `WITH SECURITY_ENFORCED` or explicit `Schema.SObjectType` checks
   - Include `selectById(Set<Id> ids)`, `selectByField(String fieldValue)` base methods
   - Use bind variables exclusively — no string concatenation in queries
   - Include field set as a private constant for reuse across queries

   **Domain pattern:**
   - Class name: `<Name>Domain.cls`
   - Operates on a list of SObject records passed via constructor
   - Methods for validation, field defaulting, and cross-record logic
   - Designed to be called from trigger handler
   - `with sharing` by default

   **Controller pattern:**
   - Class name: `<Name>Controller.cls`
   - `with sharing` enforced
   - All public methods annotated with `@AuraEnabled(cacheable=true)` or `@AuraEnabled`
   - Return wrapper classes or `List<SObject>` — no raw SOQL results
   - Include error handling with `AuraHandledException`
   - Delegate business logic to Service classes — controller is thin

   **Queueable pattern:**
   - Class name: `<Name>Queueable.cls`
   - Implements `Queueable`, optionally `Database.AllowsCallouts`
   - Constructor accepts data to process
   - `execute` method with error handling and optional chaining
   - Include a static `enqueue` convenience method

   **REST Service pattern:**
   - Class name: `<Name>RestResource.cls`
   - Annotated with `@RestResource(urlMapping='/api/<name>/*')`
   - Include `@HttpGet`, `@HttpPost` methods as needed
   - Parse `RestRequest` parameters safely
   - Return proper `RestResponse` with status codes
   - Handle exceptions and return error JSON

3. **Generate test class**
   - File: `<ClassName>Test.cls`
   - `@isTest` annotation on class
   - Target 90%+ code coverage
   - Test method naming: `test<MethodName>_<Scenario>_<ExpectedResult>`
   - Include:
     - Positive tests for each public method
     - Negative tests for error conditions and exceptions
     - Bulk tests with 200+ records for any method processing collections
     - Permission tests verifying `with sharing` behavior where applicable
   - Use `TestDataFactory` for test data if it exists in the project
   - Use `System.runAs()` for permission-sensitive tests
   - Include assertions with descriptive messages for every test

4. **Apply common standards**
   - All classes use `with sharing` unless documented otherwise
   - Include class-level ApexDoc: `@description`, `@author`, `@date`
   - Include method-level ApexDoc: `@param`, `@return`, `@throws`
   - Generate matching `-meta.xml` files with current API version
   - Follow naming conventions: PascalCase for classes, camelCase for methods

5. **Create Apex Classes**
   - Salesforce Cli Command `sf apex generate class --name <myClass> --output-dir force-app/main/default/classes`
   - Verify `.cls` and `.cls-meta.xml` for both class and test class
   - Report all created files

## Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--type` | Class pattern type | Prompt user |
| `--name` | Class name | Prompt user |
| `--object` | Related SObject API name | None |
| `--output-dir` | Output directory | `force-app/main/default/classes` |

## Error Handling

- If the class name already exists, ask whether to overwrite or pick a new name
- If the pattern type is not recognized, list available types and ask again
- If the SObject name is provided but appears invalid, warn and proceed with a TODO
- For Batch type, suggest using `/scaffold-batch` for the full batch scaffold with scheduler

## Example Usage

```
/scaffold-apex
/scaffold-apex --type Service --name AccountMerge --object Account
/scaffold-apex --type Selector --name OpportunitySelector --object Opportunity
/scaffold-apex --type Controller --name ContactSearch
/scaffold-apex --type Queueable --name LeadAssignment --object Lead
```
