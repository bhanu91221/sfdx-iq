---
paths:
  - "**/*.cls"
  - "**/*.trigger"
  - "**/*.apex"
---

# Apex Error Handling

## Custom Exception Hierarchy

Define a base exception for your application, then extend it for specific error categories.

```apex
// ✅ Good — custom exception hierarchy
public class AppException extends Exception {}
public class ValidationException extends AppException {}
public class IntegrationException extends AppException {}
public class DataAccessException extends AppException {}

// Usage
throw new ValidationException('Opportunity Amount must be positive.');
throw new IntegrationException('ERP sync failed: ' + response.getStatusCode());
```

## Try-Catch at Service Boundaries Only

Catch exceptions at the outermost layer (service or controller). Do NOT wrap every method in try-catch — let exceptions propagate naturally.

```apex
// ❌ Bad — try-catch everywhere, hiding the real problem
public class AccountDomain {
    public static void validate(List<Account> accounts) {
        try {
            for (Account acct : accounts) {
                if (String.isBlank(acct.Name)) {
                    throw new ValidationException('Name required');
                }
            }
        } catch (Exception e) {
            System.debug(e.getMessage()); // swallowed!
        }
    }
}

// ✅ Good — let domain exceptions propagate, catch at service boundary
public class AccountDomain {
    public static void validate(List<Account> accounts) {
        for (Account acct : accounts) {
            if (String.isBlank(acct.Name)) {
                throw new ValidationException('Account Name is required.');
            }
        }
    }
}

public class AccountController {
    @AuraEnabled
    public static void saveAccounts(List<Account> accounts) {
        try {
            AccountService.createAccounts(accounts);
        } catch (ValidationException e) {
            throw new AuraHandledException(e.getMessage());
        } catch (Exception e) {
            Logger.error('Unexpected error in saveAccounts', e);
            throw new AuraHandledException('An unexpected error occurred. Please contact support.');
        }
    }
}
```

## Database.SaveResult Handling

Use `Database.insert/update/delete` with `allOrNone=false` when partial success is acceptable.

```apex
// ✅ Good — process results and report errors
public static List<String> upsertRecords(List<Account> accounts) {
    List<String> errors = new List<String>();
    Database.UpsertResult[] results = Database.upsert(accounts, false);

    for (Integer i = 0; i < results.size(); i++) {
        if (!results[i].isSuccess()) {
            for (Database.Error err : results[i].getErrors()) {
                String msg = 'Record ' + accounts[i].Name
                    + ': ' + err.getStatusCode() + ' - ' + err.getMessage();
                errors.add(msg);
                Logger.error(msg);
            }
        }
    }
    return errors;
}
```

## Database.DeleteResult Handling

```apex
// ✅ Good
Database.DeleteResult[] results = Database.delete(recordsToDelete, false);
for (Integer i = 0; i < results.size(); i++) {
    if (!results[i].isSuccess()) {
        for (Database.Error err : results[i].getErrors()) {
            Logger.error('Delete failed for ' + recordsToDelete[i].Id
                + ': ' + err.getMessage());
        }
    }
}
```

## addError() on Trigger Records

Use `addError()` in triggers to block individual records without failing the entire batch.

```apex
// ❌ Bad — throwing an exception fails the entire transaction
trigger ContactTrigger on Contact (before insert) {
    for (Contact con : Trigger.new) {
        if (String.isBlank(con.Email)) {
            throw new ValidationException('Email required'); // kills ALL records
        }
    }
}

// ✅ Good — addError() marks only the invalid record
trigger ContactTrigger on Contact (before insert) {
    for (Contact con : Trigger.new) {
        if (String.isBlank(con.Email)) {
            con.Email.addError('Email is required for all contacts.');
        }
    }
}
```

## Never Swallow Exceptions

An empty catch block hides bugs and makes debugging impossible.

```apex
// ❌ Bad — silently swallowed
try {
    callExternalService();
} catch (Exception e) {
    // nothing here
}

// ❌ Bad — debug only, no action
try {
    callExternalService();
} catch (Exception e) {
    System.debug(e.getMessage());
}

// ✅ Good — log and rethrow or handle meaningfully
try {
    callExternalService();
} catch (CalloutException e) {
    Logger.error('External service callout failed', e);
    throw new IntegrationException('Service unavailable. Please retry later.');
}
```

## Logging Pattern

Use a centralized Logger utility that writes to a custom object or platform event for observability.

```apex
public with sharing class Logger {

    public static void error(String message, Exception e) {
        Log_Entry__e entry = new Log_Entry__e(
            Level__c = 'ERROR',
            Message__c = message,
            Stack_Trace__c = e.getStackTraceString(),
            Exception_Type__c = e.getTypeName(),
            Timestamp__c = Datetime.now()
        );
        EventBus.publish(entry);
    }

    public static void error(String message) {
        error(message, null);
    }

    public static void warn(String message) {
        Log_Entry__e entry = new Log_Entry__e(
            Level__c = 'WARN',
            Message__c = message,
            Timestamp__c = Datetime.now()
        );
        EventBus.publish(entry);
    }
}
```

## AuraHandledException for LWC

Always wrap exceptions in `AuraHandledException` for `@AuraEnabled` methods so the client receives a user-friendly message.

```apex
// ❌ Bad — raw exception leaks stack trace to LWC
@AuraEnabled
public static void doWork() {
    insert new Account(); // required field missing — raw DmlException to client
}

// ✅ Good — controlled error message
@AuraEnabled
public static void doWork() {
    try {
        AccountService.createDefault();
    } catch (ValidationException e) {
        throw new AuraHandledException(e.getMessage());
    } catch (Exception e) {
        Logger.error('Unhandled error in doWork', e);
        throw new AuraHandledException('Something went wrong. Contact your admin.');
    }
}
```

## Error Handling Checklist

- [ ] Custom exception classes extend `Exception`
- [ ] Try-catch only at service/controller boundaries
- [ ] `Database.SaveResult` / `UpsertResult` / `DeleteResult` checked when using `allOrNone=false`
- [ ] `addError()` used in triggers instead of throwing exceptions
- [ ] No empty catch blocks anywhere
- [ ] All `@AuraEnabled` methods wrap errors in `AuraHandledException`
- [ ] Centralized logging captures exception type, message, and stack trace
