---
name: error-handling
description: Custom exceptions, try-catch patterns, Database.SaveResult handling, error aggregation, and Platform Event logging
origin: claude-sfdx-iq
tokens: 3360
domain: apex
---

# Error Handling

## Core Principles

1. **Never swallow exceptions.** Every catch block must log, rethrow, or handle meaningfully.
2. **Catch at service boundaries.** Let exceptions propagate up; catch at the outermost layer.
3. **Use custom exceptions.** Typed exceptions communicate intent and enable targeted catching.
4. **Aggregate errors.** Collect all errors before reporting rather than failing on the first one.
5. **Separate user-facing from developer-facing messages.** Users get clear guidance; logs get stack traces.

## Custom Exception Classes

Create exception classes that extend `Exception` for each domain or error category.

```apex
public class AccountServiceException extends Exception { }
public class ValidationException extends Exception { }
public class IntegrationException extends Exception { }
public class DataAccessException extends Exception { }

// Exception with additional context
public class OrderProcessingException extends Exception {
    public Id orderId;
    public String errorCode;

    public OrderProcessingException(Id orderId, String errorCode, String message) {
        this(message);
        this.orderId = orderId;
        this.errorCode = errorCode;
    }
}
```

**Naming convention:** `{Domain}Exception` or `{Feature}Exception`.

**When to create a new exception type:**
- When callers need to catch a specific category of errors
- When the exception carries domain-specific context (IDs, error codes)
- When different recovery strategies apply to different error types

## Try-Catch at Service Boundaries

The Service layer is the natural boundary for exception handling. Internal methods throw exceptions; the Service catches and translates them.

```apex
public with sharing class AccountService {

    public static ActivationResult activateAccounts(Set<Id> accountIds) {
        ActivationResult result = new ActivationResult();

        try {
            validateInput(accountIds);
            List<Account> accounts = AccountsSelector.newInstance().selectById(accountIds);
            Accounts domain = new Accounts(accounts);
            domain.activate();

            fflib_ISObjectUnitOfWork uow = Application.UnitOfWork.newInstance();
            uow.registerDirty(domain.getRecords());
            uow.commitWork();

            result.success = true;
            result.activatedCount = accounts.size();

        } catch (ValidationException e) {
            result.success = false;
            result.errorMessage = e.getMessage();
            LogService.warn('Activation validation failed', e);

        } catch (DmlException e) {
            result.success = false;
            result.errorMessage = 'Failed to update accounts. Please try again.';
            LogService.error('Activation DML failed', e);

        } catch (Exception e) {
            result.success = false;
            result.errorMessage = 'An unexpected error occurred. Contact your administrator.';
            LogService.error('Unexpected activation error', e);
        }

        return result;
    }

    private static void validateInput(Set<Id> accountIds) {
        if (accountIds == null || accountIds.isEmpty()) {
            throw new ValidationException('Account IDs cannot be null or empty.');
        }
    }

    public class ActivationResult {
        @AuraEnabled public Boolean success;
        @AuraEnabled public String errorMessage;
        @AuraEnabled public Integer activatedCount;
    }
}
```

## Database.SaveResult Handling

When using `Database.insert(records, false)` (partial success mode), you must inspect each SaveResult.

```apex
public class DmlResultHandler {

    public static DmlSummary handleSaveResults(
        List<Database.SaveResult> results,
        List<SObject> originalRecords
    ) {
        DmlSummary summary = new DmlSummary();

        for (Integer i = 0; i < results.size(); i++) {
            Database.SaveResult sr = results[i];

            if (sr.isSuccess()) {
                summary.successCount++;
            } else {
                summary.failureCount++;
                for (Database.Error err : sr.getErrors()) {
                    DmlErrorDetail detail = new DmlErrorDetail();
                    detail.recordIndex = i;
                    detail.recordId = originalRecords[i].Id;
                    detail.statusCode = err.getStatusCode().name();
                    detail.message = err.getMessage();
                    detail.fields = err.getFields();
                    summary.errors.add(detail);
                }
            }
        }

        return summary;
    }

    public static DmlSummary handleUpsertResults(List<Database.UpsertResult> results) {
        DmlSummary summary = new DmlSummary();

        for (Database.UpsertResult ur : results) {
            if (ur.isSuccess()) {
                summary.successCount++;
                if (ur.isCreated()) {
                    summary.createdCount++;
                }
            } else {
                summary.failureCount++;
                for (Database.Error err : ur.getErrors()) {
                    DmlErrorDetail detail = new DmlErrorDetail();
                    detail.statusCode = err.getStatusCode().name();
                    detail.message = err.getMessage();
                    detail.fields = err.getFields();
                    summary.errors.add(detail);
                }
            }
        }

        return summary;
    }

    public class DmlSummary {
        public Integer successCount = 0;
        public Integer failureCount = 0;
        public Integer createdCount = 0;
        public List<DmlErrorDetail> errors = new List<DmlErrorDetail>();

        public Boolean hasErrors() {
            return failureCount > 0;
        }
    }

    public class DmlErrorDetail {
        public Integer recordIndex;
        public Id recordId;
        public String statusCode;
        public String message;
        public List<String> fields;
    }
}
```

## Trigger Record Errors with addError()

In triggers, use `addError()` to prevent a record from being saved and display a message to the user.

```apex
// On a specific field -- error appears next to the field in UI
acc.Name.addError('Account name cannot contain special characters.');

// On the record -- error appears at the top of the page
acc.addError('This account cannot be modified because it is locked.');

// Conditional validation
public static void validateAccounts(List<Account> accounts, Map<Id, Account> oldMap) {
    Set<Id> ownerIds = new Set<Id>();
    for (Account acc : accounts) {
        ownerIds.add(acc.OwnerId);
    }

    Map<Id, User> owners = new Map<Id, User>(
        [SELECT Id, IsActive FROM User WHERE Id IN :ownerIds]
    );

    for (Account acc : accounts) {
        User owner = owners.get(acc.OwnerId);
        if (owner == null || !owner.IsActive) {
            acc.OwnerId.addError('Account owner must be an active user.');
        }
    }
}
```

**Rules:**
- Use `addError()` only in before triggers or validation contexts
- Use field-level `addError()` when the error relates to a specific field
- Use record-level `addError()` for cross-field or business rule violations
- Error messages should be user-friendly and actionable

## Error Aggregation

Collect multiple errors before reporting. Do not throw on the first error when processing a batch of records.

```apex
public class BulkProcessor {

    public static ProcessingResult processBulk(List<SObject> records) {
        ProcessingResult result = new ProcessingResult();

        for (SObject record : records) {
            try {
                processSingle(record);
                result.successIds.add(record.Id);
            } catch (Exception e) {
                result.addError(record.Id, e.getMessage());
            }
        }

        if (result.hasErrors()) {
            LogService.error('Bulk processing had errors: ' + JSON.serialize(result.errors));
        }

        return result;
    }

    public class ProcessingResult {
        public List<Id> successIds = new List<Id>();
        public Map<Id, List<String>> errors = new Map<Id, List<String>>();

        public void addError(Id recordId, String message) {
            if (!errors.containsKey(recordId)) {
                errors.put(recordId, new List<String>());
            }
            errors.get(recordId).add(message);
        }

        public Boolean hasErrors() {
            return !errors.isEmpty();
        }

        public Integer totalErrors() {
            Integer count = 0;
            for (List<String> messages : errors.values()) {
                count += messages.size();
            }
            return count;
        }
    }
}
```

## User-Facing Error Messages

Translate technical exceptions into user-friendly messages in controller classes.

```apex
public class AccountController {

    @AuraEnabled
    public static String activateAccount(Id accountId) {
        try {
            AccountService.activateAccounts(new Set<Id>{ accountId });
            return 'Account activated successfully.';
        } catch (ValidationException e) {
            throw new AuraHandledException(e.getMessage());
        } catch (DmlException e) {
            String userMessage = translateDmlError(e);
            throw new AuraHandledException(userMessage);
        } catch (Exception e) {
            LogService.error('Controller error', e);
            throw new AuraHandledException(
                'An unexpected error occurred. Please contact your administrator.'
            );
        }
    }

    private static String translateDmlError(DmlException e) {
        String status = e.getDmlStatusCode(0).name();

        Map<String, String> translations = new Map<String, String>{
            'DUPLICATE_VALUE' => 'A record with this value already exists.',
            'FIELD_INTEGRITY_EXCEPTION' => 'A required related record is missing.',
            'INSUFFICIENT_ACCESS_ON_CROSS_REFERENCE_ENTITY' => 'You do not have access to a related record.',
            'REQUIRED_FIELD_MISSING' => 'Please fill in all required fields.',
            'STRING_TOO_LONG' => 'One or more fields exceeds the maximum length.'
        };

        return translations.containsKey(status)
            ? translations.get(status)
            : 'A database error occurred. Please try again.';
    }
}
```

## Platform Event Logging

For critical errors that need persistent tracking without consuming DML in the current transaction.

```apex
public class ErrorEventPublisher {

    public static void publishError(String source, Exception e) {
        Error_Log_Event__e event = new Error_Log_Event__e(
            Source__c = source,
            Message__c = e.getMessage(),
            Stack_Trace__c = e.getStackTraceString(),
            Exception_Type__c = e.getTypeName(),
            Timestamp__c = DateTime.now(),
            User_Id__c = UserInfo.getUserId()
        );
        EventBus.publish(event);
    }
}

// Subscriber trigger persists the log
trigger ErrorLogEventTrigger on Error_Log_Event__e (after insert) {
    List<Error_Log__c> logs = new List<Error_Log__c>();
    for (Error_Log_Event__e event : Trigger.new) {
        logs.add(new Error_Log__c(
            Source__c = event.Source__c,
            Message__c = event.Message__c,
            Stack_Trace__c = event.Stack_Trace__c,
            Exception_Type__c = event.Exception_Type__c,
            Log_Timestamp__c = event.Timestamp__c,
            User__c = event.User_Id__c
        ));
    }
    insert logs;
}
```

## Anti-Patterns

### Swallowing exceptions

```apex
// NEVER DO THIS
try {
    doSomething();
} catch (Exception e) {
    // empty catch block -- error is silently lost
}

// Minimum acceptable handling
try {
    doSomething();
} catch (Exception e) {
    LogService.error('doSomething failed', e);
    throw; // rethrow if the caller needs to know
}
```

### Catching too broadly too early

```apex
// BAD -- catches everything before the caller can react
public void processAccount(Account acc) {
    try {
        validate(acc);
        enrichData(acc);
        saveToExternal(acc);
    } catch (Exception e) {
        System.debug('Error: ' + e.getMessage());
    }
}

// GOOD -- let exceptions propagate; catch at service boundary
public void processAccount(Account acc) {
    validate(acc);      // throws ValidationException
    enrichData(acc);    // throws DataAccessException
    saveToExternal(acc); // throws IntegrationException
}
```

### Using generic exception messages

```apex
// BAD
throw new AccountServiceException('Error');

// GOOD
throw new AccountServiceException(
    'Cannot activate account ' + acc.Id + ': status is already "' + acc.Status__c + '"'
);
```

### Throwing in a loop

```apex
// BAD -- only processes first error
for (Account acc : accounts) {
    if (String.isBlank(acc.Name)) {
        throw new ValidationException('Name required for account: ' + acc.Id);
    }
}

// GOOD -- collect all errors
List<String> errors = new List<String>();
for (Account acc : accounts) {
    if (String.isBlank(acc.Name)) {
        errors.add('Name required for account: ' + acc.Id);
    }
}
if (!errors.isEmpty()) {
    throw new ValidationException(String.join(errors, '; '));
}
```
