---
name: logging-framework
description: Custom logging framework with Platform Events, log levels, structured format, and retention management
origin: claude-sfdx-iq
---

# Logging Framework

## Overview

A production Salesforce logging framework captures application events asynchronously using Platform Events, persists them in a custom object, and provides configurable log levels and retention policies. This avoids consuming DML limits in the originating transaction and decouples log creation from business logic.

## Architecture

```
Application Code
    |
    v
LogService (static methods)
    |
    v
Log_Event__e (Platform Event)
    |
    v
LogEventTrigger (subscriber)
    |
    v
Log__c (custom object, persistent storage)
    |
    v
LogRetentionBatch (cleanup)
```

## Custom Objects

### Log__c (Custom Object)

| Field | Type | Description |
|-------|------|-------------|
| `Level__c` | Picklist | DEBUG, INFO, WARN, ERROR, FATAL |
| `Source__c` | Text(255) | Class or method name |
| `Message__c` | Long Text | Log message |
| `Stack_Trace__c` | Long Text | Exception stack trace |
| `Exception_Type__c` | Text(255) | Exception class name |
| `User__c` | Lookup(User) | User who triggered the log |
| `Transaction_Id__c` | Text(255) | Request.getQuiddity() or custom ID |
| `Timestamp__c` | DateTime | When the event occurred |
| `Record_Id__c` | Text(18) | Related record ID (optional) |
| `Payload__c` | Long Text | JSON context data (optional) |

### Log_Event__e (Platform Event)

Mirror the Log__c fields. Platform Events publish asynchronously and do not count against the originating transaction's DML limits.

| Field | Type |
|-------|------|
| `Level__c` | Text |
| `Source__c` | Text |
| `Message__c` | Text |
| `Stack_Trace__c` | Text |
| `Exception_Type__c` | Text |
| `User_Id__c` | Text |
| `Transaction_Id__c` | Text |
| `Timestamp__c` | DateTime |
| `Record_Id__c` | Text |
| `Payload__c` | Text |

## LogService Class

```apex
public without sharing class LogService {

    private static final String CURRENT_TRANSACTION_ID = generateTransactionId();

    // Log level enum
    public enum Level { DEBUG_LEVEL, INFO_LEVEL, WARN_LEVEL, ERROR_LEVEL, FATAL_LEVEL }

    private static final Map<Level, Integer> LEVEL_PRIORITY = new Map<Level, Integer>{
        Level.DEBUG_LEVEL => 0,
        Level.INFO_LEVEL  => 1,
        Level.WARN_LEVEL  => 2,
        Level.ERROR_LEVEL => 3,
        Level.FATAL_LEVEL => 4
    };

    // Configurable minimum level (from Custom Metadata or Custom Setting)
    private static Level minimumLevel {
        get {
            if (minimumLevel == null) {
                Log_Setting__mdt setting = Log_Setting__mdt.getInstance('Default');
                if (setting != null) {
                    minimumLevel = levelFromString(setting.Minimum_Level__c);
                } else {
                    minimumLevel = Level.INFO_LEVEL;
                }
            }
            return minimumLevel;
        }
        set;
    }

    // Public logging methods

    public static void debug(String message) {
        log(Level.DEBUG_LEVEL, message, null, null);
    }

    public static void debug(String source, String message) {
        log(Level.DEBUG_LEVEL, source, message, null, null);
    }

    public static void info(String message) {
        log(Level.INFO_LEVEL, message, null, null);
    }

    public static void info(String source, String message) {
        log(Level.INFO_LEVEL, source, message, null, null);
    }

    public static void warn(String message) {
        log(Level.WARN_LEVEL, message, null, null);
    }

    public static void warn(String message, Exception e) {
        log(Level.WARN_LEVEL, message, e, null);
    }

    public static void error(String message) {
        log(Level.ERROR_LEVEL, message, null, null);
    }

    public static void error(String message, Exception e) {
        log(Level.ERROR_LEVEL, message, e, null);
    }

    public static void error(String source, String message, Exception e) {
        log(Level.ERROR_LEVEL, source, message, e, null);
    }

    public static void fatal(String message, Exception e) {
        log(Level.FATAL_LEVEL, message, e, null);
    }

    // Structured log with payload
    public static void info(String message, Map<String, Object> payload) {
        log(Level.INFO_LEVEL, message, null, payload);
    }

    public static void error(String message, Exception e, Map<String, Object> payload) {
        log(Level.ERROR_LEVEL, message, e, payload);
    }

    // Core log method

    private static void log(Level level, String message, Exception e, Map<String, Object> payload) {
        log(level, getCallingClass(), message, e, payload);
    }

    private static void log(Level level, String source, String message, Exception e, Map<String, Object> payload) {
        if (!isEnabled(level)) {
            return;
        }

        Log_Event__e event = new Log_Event__e(
            Level__c = levelToString(level),
            Source__c = source,
            Message__c = truncate(message, 131072),
            Timestamp__c = DateTime.now(),
            User_Id__c = UserInfo.getUserId(),
            Transaction_Id__c = CURRENT_TRANSACTION_ID
        );

        if (e != null) {
            event.Stack_Trace__c = truncate(e.getStackTraceString(), 131072);
            event.Exception_Type__c = e.getTypeName();
            if (String.isBlank(message)) {
                event.Message__c = e.getMessage();
            }
        }

        if (payload != null) {
            event.Payload__c = truncate(JSON.serialize(payload), 131072);
        }

        EventBus.publish(event);
    }

    // Utility methods

    private static Boolean isEnabled(Level level) {
        return LEVEL_PRIORITY.get(level) >= LEVEL_PRIORITY.get(minimumLevel);
    }

    private static String generateTransactionId() {
        return Request.getCurrent().getRequestId();
    }

    private static String getCallingClass() {
        String trace = new DmlException().getStackTraceString();
        // Parse stack trace to find the calling class
        List<String> lines = trace.split('\n');
        for (String line : lines) {
            if (!line.contains('LogService') && line.contains('Class.')) {
                Integer classStart = line.indexOf('Class.') + 6;
                Integer methodEnd = line.indexOf(':', classStart);
                if (methodEnd > classStart) {
                    return line.substring(classStart, methodEnd);
                }
            }
        }
        return 'Unknown';
    }

    private static String truncate(String value, Integer maxLength) {
        if (value != null && value.length() > maxLength) {
            return value.substring(0, maxLength);
        }
        return value;
    }

    private static Level levelFromString(String s) {
        Map<String, Level> mapping = new Map<String, Level>{
            'DEBUG' => Level.DEBUG_LEVEL,
            'INFO'  => Level.INFO_LEVEL,
            'WARN'  => Level.WARN_LEVEL,
            'ERROR' => Level.ERROR_LEVEL,
            'FATAL' => Level.FATAL_LEVEL
        };
        return mapping.containsKey(s) ? mapping.get(s) : Level.INFO_LEVEL;
    }

    private static String levelToString(Level l) {
        Map<Level, String> mapping = new Map<Level, String>{
            Level.DEBUG_LEVEL => 'DEBUG',
            Level.INFO_LEVEL  => 'INFO',
            Level.WARN_LEVEL  => 'WARN',
            Level.ERROR_LEVEL => 'ERROR',
            Level.FATAL_LEVEL => 'FATAL'
        };
        return mapping.get(l);
    }
}
```

## Platform Event Subscriber

```apex
trigger LogEventTrigger on Log_Event__e (after insert) {
    List<Log__c> logs = new List<Log__c>();

    for (Log_Event__e event : Trigger.new) {
        logs.add(new Log__c(
            Level__c = event.Level__c,
            Source__c = event.Source__c,
            Message__c = event.Message__c,
            Stack_Trace__c = event.Stack_Trace__c,
            Exception_Type__c = event.Exception_Type__c,
            User__c = event.User_Id__c,
            Transaction_Id__c = event.Transaction_Id__c,
            Timestamp__c = event.Timestamp__c,
            Record_Id__c = event.Record_Id__c,
            Payload__c = event.Payload__c
        ));
    }

    if (!logs.isEmpty()) {
        Database.insert(logs, false); // partial success to avoid losing all logs
    }
}
```

## Usage Examples

```apex
// Simple messages
LogService.info('Account activation started');
LogService.debug('Processing 200 records');

// With source
LogService.info('AccountService.activate', 'Activating 50 accounts');

// With exception
try {
    callExternalApi();
} catch (CalloutException e) {
    LogService.error('External API call failed', e);
}

// Structured logging with payload
LogService.info('Order processed', new Map<String, Object>{
    'orderId' => order.Id,
    'lineItemCount' => order.Line_Items__r.size(),
    'totalAmount' => order.Total__c,
    'processingTime' => stopwatch.getElapsedMs()
});

// Error with full context
try {
    processPayment(order);
} catch (PaymentException e) {
    LogService.error('Payment processing failed', e, new Map<String, Object>{
        'orderId' => order.Id,
        'amount' => order.Total__c,
        'gateway' => order.Payment_Gateway__c
    });
}
```

## Log Levels Guide

| Level | When to Use | Examples |
|-------|-------------|---------|
| DEBUG | Detailed diagnostic info for developers | Variable values, method entry/exit, loop iterations |
| INFO | Normal operational events | Job started, record processed, integration complete |
| WARN | Unexpected but recoverable situations | Missing optional data, deprecated API usage, retry |
| ERROR | Failures that need attention | DML failures, callout errors, validation failures |
| FATAL | Critical failures requiring immediate action | Data corruption, security breach, complete outage |

**Production default:** INFO (captures INFO, WARN, ERROR, FATAL)
**Debugging:** Temporarily set to DEBUG via Custom Metadata for specific users or transactions

## Log Retention and Cleanup

```apex
public class LogRetentionBatch implements Database.Batchable<SObject>, Schedulable {

    private static final Integer RETENTION_DAYS_DEBUG = 7;
    private static final Integer RETENTION_DAYS_INFO = 30;
    private static final Integer RETENTION_DAYS_WARN = 90;
    private static final Integer RETENTION_DAYS_ERROR = 180;
    private static final Integer RETENTION_DAYS_FATAL = 365;

    public void execute(SchedulableContext sc) {
        Database.executeBatch(this, 2000);
    }

    public Database.QueryLocator start(Database.BatchableContext bc) {
        Date oldestKeep = Date.today().addDays(-RETENTION_DAYS_FATAL);
        return Database.getQueryLocator([
            SELECT Id, Level__c, Timestamp__c
            FROM Log__c
            WHERE Timestamp__c < :oldestKeep
            OR (Level__c = 'DEBUG' AND Timestamp__c < :Date.today().addDays(-RETENTION_DAYS_DEBUG))
            OR (Level__c = 'INFO'  AND Timestamp__c < :Date.today().addDays(-RETENTION_DAYS_INFO))
            OR (Level__c = 'WARN'  AND Timestamp__c < :Date.today().addDays(-RETENTION_DAYS_WARN))
            OR (Level__c = 'ERROR' AND Timestamp__c < :Date.today().addDays(-RETENTION_DAYS_ERROR))
        ]);
    }

    public void execute(Database.BatchableContext bc, List<Log__c> scope) {
        delete scope;
    }

    public void finish(Database.BatchableContext bc) {
        LogService.info('LogRetentionBatch', 'Log cleanup completed');
    }
}
```

**Schedule nightly:**

```apex
String cronExp = '0 0 2 ? * *'; // Daily at 2 AM
System.schedule('Log Retention Cleanup', cronExp, new LogRetentionBatch());
```

## Integration with Monitoring

### Dashboard Queries

```sql
-- Error count by source (last 7 days)
SELECT Source__c, COUNT(Id) cnt
FROM Log__c
WHERE Level__c IN ('ERROR', 'FATAL')
AND Timestamp__c = LAST_N_DAYS:7
GROUP BY Source__c
ORDER BY COUNT(Id) DESC

-- Error trend by day
SELECT DAY_ONLY(Timestamp__c) logDate, COUNT(Id) cnt
FROM Log__c
WHERE Level__c = 'ERROR'
AND Timestamp__c = LAST_N_DAYS:30
GROUP BY DAY_ONLY(Timestamp__c)
ORDER BY DAY_ONLY(Timestamp__c)
```

### Alert Automation

Use a Flow or Process Builder on `Log__c` to send alerts when FATAL logs are created or when ERROR count exceeds a threshold.

## Best Practices

1. **Use Platform Events, not direct DML.** Logging should never cause a transaction rollback.
2. **Log at the right level.** Too much DEBUG in production wastes storage; too little loses diagnostic value.
3. **Include transaction IDs.** Correlate all logs from the same request.
4. **Include structured payloads.** JSON context is more useful than string concatenation.
5. **Schedule retention cleanup.** Logs grow fast; clean up old entries automatically.
6. **Make log level configurable.** Use Custom Metadata so admins can adjust without deployment.
7. **Never log sensitive data.** Do not log passwords, tokens, SSN, or PII.
8. **Use without sharing on LogService.** Logging should always succeed regardless of the user's sharing context.
