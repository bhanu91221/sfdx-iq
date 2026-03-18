---
name: flow-to-code
description: When and how to convert Flows to Apex, migration patterns, hybrid approaches, and Invocable methods
origin: claude-sfdx-iq
---

# Flow to Code Migration

## When to Convert Flows to Apex

### Convert When

| Scenario | Reason |
|----------|--------|
| Complex branching (5+ nested decisions) | Flows become unreadable and unmaintainable |
| Dynamic SOQL/SOSL | Flows cannot build queries dynamically |
| Heavy string manipulation | Apex String methods far exceed Flow formula capabilities |
| Complex data transformations | Loops with multiple collections and cross-references |
| External callouts with retry logic | Flow HTTP callout is limited; no retry/circuit breaker |
| Transaction control needed | Savepoints, partial commits, Database.update(records, false) |
| Performance-critical bulk processing | Apex offers fine-grained optimization |
| Recursion / self-referencing logic | Flows do not support recursion |
| Complex error handling | Try/catch with specific exception types |
| Unit testing requirements | Apex tests are more powerful than Flow debug |

### Keep as Flow When

| Scenario | Reason |
|----------|--------|
| Simple field updates on same record | Before-save Flow is zero-DML |
| Basic create/update related records | Declarative and admin-maintainable |
| Screen-based user interactions | Flow screens are far easier than LWC for simple forms |
| Scheduled simple operations | Scheduled Flows are easy to configure |
| Simple email alerts / notifications | Standard Flow actions suffice |
| Admin-maintainable business logic | Admins can modify without deployments |

## Migration Patterns

### Pattern 1: Direct Replacement

Replace a record-triggered flow entirely with an Apex trigger + handler.

**Before (Flow):**
```
Record-Triggered Flow on Case (After Create)
  → Get Account
  → Decision: Is Premium?
  → Update Account (Last_Case_Date__c)
  → Create Task for Owner
```

**After (Apex):**
```apex
// triggers/CaseTrigger.trigger
trigger CaseTrigger on Case (after insert) {
    CaseTriggerHandler.handleAfterInsert(Trigger.new);
}

// classes/CaseTriggerHandler.cls
public with sharing class CaseTriggerHandler {

    public static void handleAfterInsert(List<Case> newCases) {
        Set<Id> accountIds = new Set<Id>();
        for (Case c : newCases) {
            if (c.AccountId != null) {
                accountIds.add(c.AccountId);
            }
        }

        if (accountIds.isEmpty()) return;

        Map<Id, Account> accounts = new Map<Id, Account>([
            SELECT Id, Premium__c, OwnerId
            FROM Account
            WHERE Id IN :accountIds
        ]);

        List<Account> accountsToUpdate = new List<Account>();
        List<Task> tasksToCreate = new List<Task>();

        for (Case c : newCases) {
            Account acct = accounts.get(c.AccountId);
            if (acct != null && acct.Premium__c) {
                accountsToUpdate.add(new Account(
                    Id = acct.Id,
                    Last_Case_Date__c = Date.today()
                ));
                tasksToCreate.add(new Task(
                    Subject = 'Review Premium Case: ' + c.Subject,
                    WhatId = c.Id,
                    OwnerId = acct.OwnerId
                ));
            }
        }

        if (!accountsToUpdate.isEmpty()) update accountsToUpdate;
        if (!tasksToCreate.isEmpty()) insert tasksToCreate;
    }
}
```

### Pattern 2: Hybrid Approach (Flow Invokes Apex)

Keep the flow for orchestration but delegate complex logic to Apex.

```apex
public with sharing class FlowActions {

    @InvocableMethod(
        label='Calculate Account Health Score'
        description='Computes a health score based on multiple factors'
        category='Account Management'
    )
    public static List<HealthScoreResult> calculateHealthScore(
        List<HealthScoreRequest> requests
    ) {
        List<HealthScoreResult> results = new List<HealthScoreResult>();

        // Bulk collect all account IDs
        Set<Id> accountIds = new Set<Id>();
        for (HealthScoreRequest req : requests) {
            accountIds.add(req.accountId);
        }

        // Single query for all data
        Map<Id, Account> accounts = new Map<Id, Account>([
            SELECT Id, AnnualRevenue, NumberOfEmployees,
                   (SELECT Id, Amount, CloseDate FROM Opportunities
                    WHERE IsClosed = false),
                   (SELECT Id, Status FROM Cases
                    WHERE CreatedDate = LAST_N_DAYS:90)
            FROM Account WHERE Id IN :accountIds
        ]);

        for (HealthScoreRequest req : requests) {
            Account acct = accounts.get(req.accountId);
            HealthScoreResult result = new HealthScoreResult();
            result.score = computeScore(acct);
            result.tier = deriveTier(result.score);
            result.recommendations = buildRecommendations(acct, result.score);
            results.add(result);
        }

        return results;
    }

    private static Decimal computeScore(Account acct) {
        Decimal score = 50; // Base score
        if (acct.AnnualRevenue > 1000000) score += 20;
        if (acct.Opportunities != null && !acct.Opportunities.isEmpty()) score += 15;
        if (acct.Cases != null) {
            Integer openCases = 0;
            for (Case c : acct.Cases) {
                if (c.Status != 'Closed') openCases++;
            }
            score -= (openCases * 5);
        }
        return Math.max(0, Math.min(100, score));
    }

    private static String deriveTier(Decimal score) {
        if (score >= 80) return 'Platinum';
        if (score >= 60) return 'Gold';
        if (score >= 40) return 'Silver';
        return 'Bronze';
    }

    private static String buildRecommendations(Account acct, Decimal score) {
        List<String> recs = new List<String>();
        if (score < 60) recs.add('Schedule executive review');
        if (acct.Opportunities == null || acct.Opportunities.isEmpty()) {
            recs.add('Create new opportunity');
        }
        return String.join(recs, '; ');
    }
}
```

### InvocableMethod Input/Output Classes

```apex
public class HealthScoreRequest {
    @InvocableVariable(required=true label='Account ID' description='The Account to score')
    public Id accountId;

    @InvocableVariable(label='Include History' description='Include historical data in scoring')
    public Boolean includeHistory = false;
}

public class HealthScoreResult {
    @InvocableVariable(label='Score' description='Computed health score 0-100')
    public Decimal score;

    @InvocableVariable(label='Tier' description='Account tier based on score')
    public String tier;

    @InvocableVariable(label='Recommendations' description='Semicolon-separated recommendations')
    public String recommendations;
}
```

## @InvocableMethod Requirements

```
1. Must be static
2. Must accept List<T> parameter (bulkification)
3. Must return List<T> or void
4. Only ONE @InvocableMethod per class
5. Input/output classes use @InvocableVariable
6. Supported parameter types: primitives, SObject, Apex-defined types, collections
```

### @InvocableVariable Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `label` | String | Display name in Flow Builder |
| `description` | String | Help text in Flow Builder |
| `required` | Boolean | Whether the variable is mandatory |

## Pattern 3: Apex Action for Callouts

```apex
public with sharing class ExternalValidationAction {

    @InvocableMethod(
        label='Validate Address with External Service'
        description='Calls external geocoding API to validate address'
        callout=true
    )
    public static List<ValidationResult> validateAddresses(
        List<ValidationRequest> requests
    ) {
        List<ValidationResult> results = new List<ValidationResult>();

        for (ValidationRequest req : requests) {
            HttpRequest httpReq = new HttpRequest();
            httpReq.setEndpoint('callout:GeocodingService/validate');
            httpReq.setMethod('POST');
            httpReq.setHeader('Content-Type', 'application/json');
            httpReq.setBody(JSON.serialize(new Map<String, String>{
                'street' => req.street,
                'city' => req.city,
                'state' => req.state,
                'zip' => req.zip
            }));

            Http http = new Http();
            HttpResponse res = http.send(httpReq);

            ValidationResult result = new ValidationResult();
            if (res.getStatusCode() == 200) {
                Map<String, Object> body = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
                result.isValid = (Boolean) body.get('valid');
                result.normalizedAddress = (String) body.get('formatted');
                result.latitude = (Decimal) body.get('lat');
                result.longitude = (Decimal) body.get('lng');
            } else {
                result.isValid = false;
                result.errorMessage = 'Validation service error: ' + res.getStatusCode();
            }
            results.add(result);
        }

        return results;
    }
}
```

## Migration Checklist

```
Pre-Migration:
[ ] Document the flow's current behavior (screenshots, description)
[ ] Identify all flow versions (active and inactive)
[ ] Map flow elements to Apex equivalents
[ ] Identify test scenarios from flow debug history
[ ] Check for dependent flows or processes

Implementation:
[ ] Write Apex class with bulkified logic
[ ] If hybrid: create @InvocableMethod with proper input/output classes
[ ] If full replacement: create trigger + handler
[ ] Handle all error scenarios (fault paths → try/catch)
[ ] Respect sharing model (with sharing keyword)
[ ] Enforce CRUD/FLS where applicable

Testing:
[ ] Write unit tests covering all flow paths (75% minimum, 90%+ target)
[ ] Test with bulk data (200+ records)
[ ] Test negative cases and error paths
[ ] Verify governor limit consumption
[ ] Compare behavior with original flow

Deployment:
[ ] Deploy Apex code first (inactive)
[ ] Run all tests in target org
[ ] Deactivate the flow
[ ] Activate the Apex solution
[ ] Monitor for errors for 24-48 hours
[ ] Keep flow available (inactive) for rollback
```

## Maintaining Declarative Where Possible

### Decision Framework

```
Complexity Score:
  +1 for each Get Records element
  +1 for each Decision with 3+ outcomes
  +2 for each Loop
  +2 for each Apex Action
  +3 for nested loops
  +3 for cross-object collection operations

Score < 5:  Keep as Flow
Score 5-10: Consider hybrid (Flow + Apex Actions)
Score > 10: Convert to Apex
```

### Hybrid Architecture

```
Flow (Orchestration Layer):
  → Entry conditions and routing
  → User interaction (Screen elements)
  → Simple field updates (Before-Save)
  → Calls Apex Actions for complex logic

Apex (Processing Layer):
  → Complex calculations
  → External callouts
  → Bulk data operations
  → Dynamic SOQL/SOSL
  → Transaction control
```
