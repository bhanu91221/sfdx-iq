---
description: Generate TestDataFactory class for Apex tests
---

# /test-data

Generate a comprehensive `TestDataFactory` utility class that creates test data for specified Salesforce objects with proper field population, bulk overloads, and relationship handling.

## Workflow

1. **Gather requirements**
   - Ask the user which SObjects need factory methods (e.g., Account, Contact, Opportunity, Case, Custom__c)
   - If the user does not specify, default to common objects: Account, Contact, Opportunity, Lead, Case
   - Ask if any custom objects are needed and their required fields
   - Determine if any specific record types are needed

2. **Analyze object schema**
   - For each requested object, identify:
     - Required fields (non-nillable fields without defaults)
     - Key lookup/master-detail relationships
     - Record type IDs if record types are requested
     - Any unique or external ID fields
   - Check existing test classes for patterns already in use

3. **Generate TestDataFactory class**
   - Create `TestDataFactory.cls` with `@isTest` annotation
   - For each object, generate two methods:
     - **Single record**: `createObjectName()` — returns one SObject with all required fields populated
     - **Bulk records**: `createObjectNames(Integer count)` — returns `List<SObject>` with specified count
   - Each method should:
     - Populate all required fields with realistic test values
     - Use `Math.random()` or index-based values for uniqueness
     - Handle parent relationships (create parent records when needed)
     - Accept an optional `Map<String, Object>` parameter for field overrides
     - Insert records by default, with a `doInsert` Boolean parameter option

4. **Build relationship hierarchy**
   - Order factory methods by dependency: parents before children
   - Account before Contact, Contact before Case, etc.
   - Provide convenience methods that create full hierarchies:
     - `createAccountWithContacts(Integer contactCount)`
     - `createOpportunityWithLineItems(Integer lineItemCount)`
   - Ensure referential integrity across all created records

5. **Generate test class**
   - Create `TestDataFactoryTest.cls` to validate the factory itself
   - Test each factory method: single create, bulk create (200+ records), field override
   - Verify required fields are populated
   - Verify relationships are correctly established
   - Assert record counts after bulk creation

6. **Apply best practices**
   - Use `@isTest` on the factory class
   - Never hardcode Record Type IDs — query by DeveloperName
   - Use `SObjectType.getDescribe()` for dynamic field defaults where appropriate
   - Include `@TestSetup` example showing how to use the factory
   - Add comments explaining each method's purpose and parameters

## Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--objects` | Comma-separated list of SObject API names | Prompt user |
| `--bulk-size` | Default bulk creation size | `200` |
| `--with-relationships` | Include relationship helper methods | `true` |
| `--output-dir` | Directory for generated files | `force-app/main/default/classes` |

## Error Handling

- If a `TestDataFactory` class already exists, ask whether to merge or replace
- If an object API name is invalid, warn the user and skip that object
- If required field information is unavailable (no org connected), use common Salesforce field patterns
- If the user requests objects with circular dependencies, create methods with explicit parent parameters

## Example Usage

```
/test-data
/test-data --objects Account,Contact,Opportunity,Custom_Object__c
/test-data --objects Case,CaseComment --bulk-size 500
/test-data --objects Account,Contact --with-relationships
```
