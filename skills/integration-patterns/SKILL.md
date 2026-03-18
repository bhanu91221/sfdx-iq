---
name: integration-patterns
description: Salesforce integration patterns including REST/SOAP callouts, Named Credentials, retry logic, and async integration
origin: claude-sfdx-iq
---

# Integration Patterns

## Named Credentials Setup

Named Credentials are the preferred method for authenticating external callouts. They abstract endpoint URLs and authentication from code.

### Named Credential Configuration

```xml
<!-- namedCredentials/PaymentGateway.namedCredential-meta.xml -->
<NamedCredential>
    <label>Payment Gateway</label>
    <fullName>PaymentGateway</fullName>
    <endpoint>https://api.paymentgateway.com/v2</endpoint>
    <principalType>NamedUser</principalType>
    <protocol>Oauth</protocol>
</NamedCredential>
```

### External Credential (New Model - Spring '23+)

```xml
<ExternalCredential>
    <label>Payment Gateway Credential</label>
    <authenticationProtocol>OAuth2ClientCredentials</authenticationProtocol>
    <externalCredentialParameters>
        <parameterName>ClientId</parameterName>
        <parameterType>AuthProvider</parameterType>
    </externalCredentialParameters>
</ExternalCredential>
```

## REST Callout Patterns

### Basic HttpRequest/HttpResponse

```apex
public class ExternalServiceCallout {

    public static HttpResponse makeGetRequest(String endpoint) {
        HttpRequest req = new HttpRequest();
        req.setEndpoint('callout:PaymentGateway/' + endpoint);
        req.setMethod('GET');
        req.setTimeout(30000); // 30 second timeout
        req.setHeader('Content-Type', 'application/json');
        req.setHeader('Accept', 'application/json');

        Http http = new Http();
        HttpResponse res = http.send(req);
        return res;
    }

    public static HttpResponse makePostRequest(String endpoint, String body) {
        HttpRequest req = new HttpRequest();
        req.setEndpoint('callout:PaymentGateway/' + endpoint);
        req.setMethod('POST');
        req.setTimeout(30000);
        req.setHeader('Content-Type', 'application/json');
        req.setBody(body);

        Http http = new Http();
        HttpResponse res = http.send(req);
        return res;
    }
}
```

### Response Handling Pattern

```apex
public class CalloutResponseHandler {

    public static Map<String, Object> handleResponse(HttpResponse res) {
        Integer statusCode = res.getStatusCode();

        if (statusCode >= 200 && statusCode < 300) {
            return (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
        } else if (statusCode == 401) {
            throw new CalloutException('Authentication failed. Check Named Credential.');
        } else if (statusCode == 429) {
            throw new CalloutException('Rate limited. Retry after: ' + res.getHeader('Retry-After'));
        } else if (statusCode >= 500) {
            throw new CalloutException('External service error: ' + statusCode);
        } else {
            throw new CalloutException('Unexpected status: ' + statusCode + ' Body: ' + res.getBody());
        }
    }
}
```

## SOAP Callout Pattern

```apex
// Generated from WSDL via WSDL2Apex
public class SoapIntegrationService {

    public static String callSoapService(String accountId) {
        // WSDL-generated stub
        externalService.ServicePort port = new externalService.ServicePort();
        port.endpoint_x = 'callout:SoapService';
        port.timeout_x = 30000;

        try {
            externalService.Response result = port.getAccountDetails(accountId);
            return result.status;
        } catch (CalloutException e) {
            Logger.error('SOAP callout failed', e);
            throw e;
        }
    }
}
```

## Retry with Exponential Backoff

```apex
public class RetryableCallout {

    private static final Integer MAX_RETRIES = 3;
    private static final Integer BASE_DELAY_MS = 1000;

    public static HttpResponse callWithRetry(HttpRequest req) {
        Integer attempts = 0;
        HttpResponse res;

        while (attempts < MAX_RETRIES) {
            try {
                Http http = new Http();
                res = http.send(req);

                if (res.getStatusCode() < 500) {
                    return res; // Success or client error - no retry
                }
            } catch (CalloutException e) {
                if (attempts == MAX_RETRIES - 1) {
                    throw e;
                }
            }

            attempts++;
            // Note: Thread.sleep is not available in Apex
            // Use Queueable chaining for actual delays
        }
        return res;
    }

    // Queueable-based retry with actual delay
    public class RetryQueueable implements Queueable, Database.AllowsCallouts {
        private HttpRequest request;
        private Integer attempt;
        private Integer maxAttempts;

        public RetryQueueable(HttpRequest req, Integer attempt, Integer maxAttempts) {
            this.request = req;
            this.attempt = attempt;
            this.maxAttempts = maxAttempts;
        }

        public void execute(QueueableContext context) {
            Http http = new Http();
            HttpResponse res = http.send(request);

            if (res.getStatusCode() >= 500 && attempt < maxAttempts) {
                System.enqueueJob(new RetryQueueable(request, attempt + 1, maxAttempts));
            } else {
                processResponse(res);
            }
        }

        private void processResponse(HttpResponse res) {
            // Handle final response
        }
    }
}
```

## Circuit Breaker Pattern

```apex
public class CircuitBreaker {

    private static final String CIRCUIT_SETTING = 'CircuitBreaker';

    public enum State { CLOSED, OPEN, HALF_OPEN }

    public static Boolean isCircuitOpen(String serviceName) {
        Integration_Circuit__mdt config = Integration_Circuit__mdt.getInstance(serviceName);
        if (config == null) return false;

        Circuit_Breaker_State__c state = Circuit_Breaker_State__c.getInstance(serviceName);
        if (state == null) return false;

        if (state.State__c == 'OPEN') {
            // Check if cooldown period has elapsed
            Long cooldownMs = (Long) config.Cooldown_Seconds__c * 1000;
            if (Datetime.now().getTime() - state.Last_Failure__c.getTime() > cooldownMs) {
                return false; // Allow half-open attempt
            }
            return true;
        }
        return false;
    }

    public static void recordFailure(String serviceName) {
        Circuit_Breaker_State__c state = Circuit_Breaker_State__c.getInstance(serviceName);
        Integration_Circuit__mdt config = Integration_Circuit__mdt.getInstance(serviceName);

        state.Failure_Count__c = (state.Failure_Count__c == null ? 0 : state.Failure_Count__c) + 1;
        state.Last_Failure__c = Datetime.now();

        if (state.Failure_Count__c >= config.Failure_Threshold__c) {
            state.State__c = 'OPEN';
        }
        upsert state;
    }

    public static void recordSuccess(String serviceName) {
        Circuit_Breaker_State__c state = Circuit_Breaker_State__c.getInstance(serviceName);
        state.Failure_Count__c = 0;
        state.State__c = 'CLOSED';
        upsert state;
    }
}
```

## Bulk Callout Patterns

```apex
public class BulkCalloutQueueable implements Queueable, Database.AllowsCallouts {

    private List<Id> recordIds;
    private Integer batchIndex;
    private static final Integer CALLOUT_BATCH_SIZE = 90; // Stay under 100 callout limit

    public BulkCalloutQueueable(List<Id> recordIds, Integer batchIndex) {
        this.recordIds = recordIds;
        this.batchIndex = batchIndex;
    }

    public void execute(QueueableContext context) {
        Integer startIdx = batchIndex * CALLOUT_BATCH_SIZE;
        Integer endIdx = Math.min(startIdx + CALLOUT_BATCH_SIZE, recordIds.size());

        List<Id> currentBatch = new List<Id>();
        for (Integer i = startIdx; i < endIdx; i++) {
            currentBatch.add(recordIds[i]);
        }

        for (Id recId : currentBatch) {
            // Make individual callouts
            makeCalloutForRecord(recId);
        }

        // Chain next batch if more records remain
        if (endIdx < recordIds.size()) {
            System.enqueueJob(new BulkCalloutQueueable(recordIds, batchIndex + 1));
        }
    }

    private void makeCalloutForRecord(Id recId) {
        // Callout logic
    }
}
```

## Callout from Triggers

Triggers cannot make direct callouts. Use @future or Queueable.

```apex
// @future approach - fire-and-forget
public class AccountCalloutService {

    @future(callout=true)
    public static void syncToExternal(Set<Id> accountIds) {
        List<Account> accounts = [
            SELECT Id, Name, BillingCity
            FROM Account
            WHERE Id IN :accountIds
        ];
        // Make callout with account data
    }
}

// Queueable approach - better error handling, chaining
public class AccountSyncQueueable implements Queueable, Database.AllowsCallouts {
    private Set<Id> accountIds;

    public AccountSyncQueueable(Set<Id> accountIds) {
        this.accountIds = accountIds;
    }

    public void execute(QueueableContext context) {
        List<Account> accounts = [
            SELECT Id, Name, BillingCity
            FROM Account
            WHERE Id IN :accountIds
        ];
        // Make callout, handle errors, optionally chain
    }
}
```

## Decision Matrix: Integration Approach

| Scenario | Pattern | Reason |
|----------|---------|--------|
| Real-time sync needed | REST callout from trigger via @future | Immediate, simple |
| Complex retry needed | Queueable with chaining | Retry + error handling |
| High-volume sync | Batch Apex + Database.AllowsCallouts | Scales to millions |
| Event-driven integration | Platform Events | Decoupled, reliable |
| Near-real-time replication | Change Data Capture | Automatic, field-level |
| Inbound from external | Custom REST/SOAP endpoint | Full control |
| Middleware orchestration | Platform Events + Heroku/MuleSoft | Complex routing |

## Governor Limits for Callouts

| Limit | Value |
|-------|-------|
| Maximum callouts per transaction | 100 |
| Maximum callout timeout | 120 seconds |
| Maximum response size | 6 MB (sync), 12 MB (async) |
| Maximum request size | 6 MB (sync), 12 MB (async) |
| Maximum @future calls per transaction | 50 |
| Cumulative callout timeout | 120 seconds total |
