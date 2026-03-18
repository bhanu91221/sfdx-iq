---
description: Generate an Apex class with matching test class
---

# /scaffold-apex-class

Generate a new Apex class following Salesforce best practices, with a matching test class.

## Workflow

1. **Gather requirements**
   - Ask for the class name (PascalCase)
   - Ask for the class type:

   | Type | Pattern | Example |
   |------|---------|---------|
   | Service | Business logic, orchestration | `InvoiceService` |
   | Selector | SOQL query encapsulation | `AccountSelector` |
   | Domain | SObject behavior, validation | `Accounts` |
   | Controller | Aura/LWC backend | `AccountSearchController` |
   | Utility | Static helper methods | `DateUtils` |
   | DTO | Data transfer object | `PaymentDTO` |
   | Wrapper | Wrapper Classes to Wrap <List> of <List> | `InvoiceWrapper` |

2. **Create Apex Classes**
   - Salesforce Cli Command `sf apex generate class --name <myClass> --output-dir force-app/main/default/classes`.

3. **Generate the class**
   Based on type, generate with appropriate structure:

   **Service class:**
   ```apex
   public with sharing class InvoiceService {
       /**
        * @description [Method description]
        * @param invoiceIds Set of Invoice IDs to process
        */
       public static void processInvoices(Set<Id> invoiceIds) {
           // Implementation
       }
   }
   ```

   **Selector class:**
   ```apex
   public with sharing class InvoiceSelector {
       public List<Invoice__c> selectById(Set<Id> ids) {
           return [SELECT Id, Name, Status__c FROM Invoice__c WHERE Id IN :ids WITH SECURITY_ENFORCED];
       }
   }
   ```

4. **Generate the test class**
   Always create `ClassNameTest.cls` with:
   - `@isTest` annotation
   - `@TestSetup` method using `TestDataFactory`
   - Test method per public method: `testMethodName_Scenario_ExpectedResult`
   - `Test.startTest()` / `Test.stopTest()` in every test
   - Meaningful assertions with descriptive messages
   - Bulk test with 200+ records (for trigger-related classes)

5. **Apex Classes - File Structure from above Commands**
   - `force-app/main/default/classes/ClassName.cls`
   - `force-app/main/default/classes/ClassName.cls-meta.xml`
   - `force-app/main/default/classes/ClassNameTest.cls`
   - `force-app/main/default/classes/ClassNameTest.cls-meta.xml`

## Flags

| Flag | Description |
|------|-------------|
| `--type` | Class type: `service`, `selector`, `domain`, `controller`, `utility`, `dto`, `wrapper` |
| `--object` | Related SObject (e.g., `Account`, `Invoice__c`) |
| `--methods` | Comma-separated method names to scaffold |

## Example

```
/scaffold-apex-class InvoiceService --type service --object Invoice__c
/scaffold-apex-class AccountSelector --type selector --object Account
```
