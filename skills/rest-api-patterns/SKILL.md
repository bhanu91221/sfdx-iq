---
name: rest-api-patterns
description: Salesforce REST API patterns including custom endpoints, Composite API, Bulk API 2.0, and authentication
origin: claude-sfdx-iq
tokens: 2854
domain: integration
---

# REST API Patterns

## Custom REST Endpoint (@RestResource)

### Basic Endpoint

```apex
@RestResource(urlMapping='/accounts/*')
global with sharing class AccountRestService {

    @HttpGet
    global static Account getAccount() {
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;

        // Extract ID from URL: /services/apexrest/accounts/001xx000003DGb0
        String accountId = req.requestURI.substringAfterLast('/');

        try {
            Account acct = [
                SELECT Id, Name, Industry, AnnualRevenue, BillingCity
                FROM Account
                WHERE Id = :accountId
                WITH SECURITY_ENFORCED
                LIMIT 1
            ];
            return acct;
        } catch (QueryException e) {
            res.statusCode = 404;
            return null;
        }
    }

    @HttpPost
    global static Id createAccount() {
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;

        Map<String, Object> body = (Map<String, Object>) JSON.deserializeUntyped(
            req.requestBody.toString()
        );

        Account acct = new Account(
            Name = (String) body.get('name'),
            Industry = (String) body.get('industry')
        );

        try {
            insert acct;
            res.statusCode = 201;
            return acct.Id;
        } catch (DmlException e) {
            res.statusCode = 400;
            res.responseBody = Blob.valueOf(
                JSON.serialize(new Map<String, String>{
                    'error' => e.getMessage()
                })
            );
            return null;
        }
    }

    @HttpPatch
    global static Account updateAccount() {
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;
        String accountId = req.requestURI.substringAfterLast('/');

        Map<String, Object> body = (Map<String, Object>) JSON.deserializeUntyped(
            req.requestBody.toString()
        );

        Account acct = new Account(Id = accountId);
        if (body.containsKey('name')) acct.Name = (String) body.get('name');
        if (body.containsKey('industry')) acct.Industry = (String) body.get('industry');

        try {
            update acct;
            res.statusCode = 200;
            return [SELECT Id, Name, Industry FROM Account WHERE Id = :accountId LIMIT 1];
        } catch (DmlException e) {
            res.statusCode = 400;
            return null;
        }
    }

    @HttpDelete
    global static void deleteAccount() {
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;
        String accountId = req.requestURI.substringAfterLast('/');

        try {
            delete [SELECT Id FROM Account WHERE Id = :accountId LIMIT 1];
            res.statusCode = 204;
        } catch (Exception e) {
            res.statusCode = 400;
        }
    }
}
```

## RestRequest / RestResponse

### RestRequest Properties

| Property | Type | Description |
|----------|------|-------------|
| `httpMethod` | String | GET, POST, PATCH, PUT, DELETE |
| `requestURI` | String | Full request URI |
| `requestBody` | Blob | Request body |
| `headers` | Map<String, String> | HTTP headers |
| `params` | Map<String, String> | URL query parameters |
| `remoteAddress` | String | Client IP address |

### RestResponse Properties

| Property | Type | Description |
|----------|------|-------------|
| `statusCode` | Integer | HTTP status code |
| `responseBody` | Blob | Response body |
| `headers` | Map<String, String> | Response headers |

### Working with Parameters

```apex
@HttpGet
global static List<Account> searchAccounts() {
    RestRequest req = RestContext.request;

    // Query parameters: /accounts?industry=Technology&limit=10
    String industry = req.params.get('industry');
    String limitStr = req.params.get('limit');
    Integer queryLimit = String.isNotBlank(limitStr) ? Integer.valueOf(limitStr) : 25;

    String query = 'SELECT Id, Name, Industry FROM Account';
    if (String.isNotBlank(industry)) {
        query += ' WHERE Industry = :industry';
    }
    query += ' WITH SECURITY_ENFORCED';
    query += ' LIMIT :queryLimit';

    return Database.query(query);
}
```

## Composite API Usage

Composite API allows up to 25 subrequests in a single call with referencing between them.

### Composite Request Structure

```json
POST /services/data/v59.0/composite

{
    "allOrNone": true,
    "compositeRequest": [
        {
            "method": "POST",
            "url": "/services/data/v59.0/sobjects/Account",
            "referenceId": "newAccount",
            "body": {
                "Name": "Acme Corp",
                "Industry": "Technology"
            }
        },
        {
            "method": "POST",
            "url": "/services/data/v59.0/sobjects/Contact",
            "referenceId": "newContact",
            "body": {
                "LastName": "Smith",
                "AccountId": "@{newAccount.id}"
            }
        },
        {
            "method": "GET",
            "url": "/services/data/v59.0/sobjects/Account/@{newAccount.id}",
            "referenceId": "getAccount"
        }
    ]
}
```

### Composite Limits

| Limit | Value |
|-------|-------|
| Subrequests per call | 25 |
| Query subrequests | 5 |
| allOrNone support | Yes (atomic) |
| Reference variables | Yes (@{refId.field}) |

## Bulk API 2.0 Patterns

### Ingest Job Flow

```
1. Create Job  →  POST /services/data/v59.0/jobs/ingest
2. Upload CSV  →  PUT /services/data/v59.0/jobs/ingest/{jobId}/batches
3. Close Job   →  PATCH /services/data/v59.0/jobs/ingest/{jobId}
4. Poll Status →  GET /services/data/v59.0/jobs/ingest/{jobId}
5. Get Results →  GET /services/data/v59.0/jobs/ingest/{jobId}/successfulResults
```

### Create Ingest Job

```json
POST /services/data/v59.0/jobs/ingest

{
    "object": "Account",
    "operation": "upsert",
    "externalIdFieldName": "External_Id__c",
    "contentType": "CSV",
    "lineEnding": "LF"
}
```

### Upload CSV Data

```
PUT /services/data/v59.0/jobs/ingest/{jobId}/batches
Content-Type: text/csv

Name,External_Id__c,Industry
"Acme Corp","EXT-001","Technology"
"Beta Inc","EXT-002","Finance"
```

### Bulk API 2.0 Operations

| Operation | Description |
|-----------|-------------|
| `insert` | Create new records |
| `update` | Update existing records |
| `upsert` | Insert or update by external ID |
| `delete` | Delete records |
| `hardDelete` | Permanently delete (no recycle bin) |

### Bulk API 2.0 Limits

| Limit | Value |
|-------|-------|
| Max file size per upload | 150 MB |
| Max record size | 10 MB |
| Max fields per record | 5,000 |
| Max records per batch | 10,000 |
| Concurrent jobs | 100 ingest + 100 query |
| Daily batches | 15,000 |

## sObject Collections

Operate on up to 200 records in a single API call.

### Create Multiple Records

```json
POST /services/data/v59.0/composite/sobjects

{
    "allOrNone": false,
    "records": [
        {
            "attributes": {"type": "Account"},
            "Name": "Acme Corp",
            "Industry": "Technology"
        },
        {
            "attributes": {"type": "Account"},
            "Name": "Beta Inc",
            "Industry": "Finance"
        }
    ]
}
```

### Update Multiple Records

```json
PATCH /services/data/v59.0/composite/sobjects

{
    "allOrNone": true,
    "records": [
        {
            "attributes": {"type": "Account"},
            "id": "001xx000003DGb0AAG",
            "Industry": "Healthcare"
        },
        {
            "attributes": {"type": "Account"},
            "id": "001xx000003DGb1AAG",
            "Industry": "Finance"
        }
    ]
}
```

### Retrieve Multiple Records

```
GET /services/data/v59.0/composite/sobjects/Account?ids=001xx000003DGb0,001xx000003DGb1&fields=Id,Name,Industry
```

### Delete Multiple Records

```
DELETE /services/data/v59.0/composite/sobjects?ids=001xx000003DGb0,001xx000003DGb1&allOrNone=false
```

## Query via REST

### Basic Query

```
GET /services/data/v59.0/query/?q=SELECT+Id,Name+FROM+Account+WHERE+Industry='Technology'+LIMIT+10
```

### Pagination with nextRecordsUrl

```json
// Initial query response
{
    "totalSize": 5000,
    "done": false,
    "nextRecordsUrl": "/services/data/v59.0/query/01gxx000000MAAAAA2-2000",
    "records": [...]
}

// Fetch next page
GET /services/data/v59.0/query/01gxx000000MAAAAA2-2000

// Continue until "done": true
```

### Query Performance

```
- Default batch size: 2,000 records
- Set batch size header: Sforce-Query-Options: batchSize=200
- Min batch size: 200
- Max batch size: 2,000
- Use LIMIT for known small result sets
```

## Error Response Format

### Standard Error Response

```json
[
    {
        "message": "Session expired or invalid",
        "errorCode": "INVALID_SESSION_ID"
    }
]
```

### DML Error Response

```json
[
    {
        "message": "Required fields are missing: [Name]",
        "errorCode": "REQUIRED_FIELD_MISSING",
        "fields": ["Name"]
    }
]
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_SESSION_ID` | 401 | Token expired |
| `REQUEST_LIMIT_EXCEEDED` | 403 | API limit hit |
| `NOT_FOUND` | 404 | Resource not found |
| `INVALID_FIELD` | 400 | Bad field name |
| `MALFORMED_QUERY` | 400 | Invalid SOQL |
| `REQUIRED_FIELD_MISSING` | 400 | Missing required field |
| `DUPLICATE_VALUE` | 400 | Unique constraint violated |
| `ENTITY_IS_LOCKED` | 400 | Approval process lock |
| `SERVER_UNAVAILABLE` | 503 | Retry with backoff |

## Authentication Patterns

### OAuth 2.0 Flows

| Flow | Use Case |
|------|----------|
| Web Server (Authorization Code) | User-facing web apps |
| JWT Bearer | Server-to-server integration |
| Client Credentials | Service accounts (no user context) |
| Device Flow | Input-limited devices |
| Refresh Token | Renewing expired access tokens |

### JWT Bearer Flow

```
POST /services/oauth2/token

grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer
&assertion={JWT}

JWT Payload:
{
    "iss": "connected_app_client_id",
    "sub": "user@example.com",
    "aud": "https://login.salesforce.com",
    "exp": 1234567890
}
```

### Token Refresh

```
POST /services/oauth2/token

grant_type=refresh_token
&client_id={connected_app_id}
&client_secret={connected_app_secret}
&refresh_token={stored_refresh_token}
```

## API Limits

| Limit | Value |
|-------|-------|
| API requests per 24 hours | Based on edition + licenses |
| Concurrent API limit | 25 (long-running) |
| Max response size | 15 MB (query) |
| Max request body size | 50 MB |
| Composite subrequests | 25 per call |
| sObject Collections | 200 records per call |
