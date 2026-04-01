---
name: visualforce-patterns
description: Visualforce page patterns, controllers, ViewState management, and VF-to-LWC migration strategies
origin: claude-sfdx-iq
user-invocable: false
tokens: 3703
domain: platform
---

# Visualforce Patterns

## Page Structure

A Visualforce page is a server-rendered markup page that uses Apex controllers for logic and data binding.

```xml
<apex:page controller="AccountSearchController" lightningStylesheets="true" docType="html-5.0">
    <apex:form id="mainForm">
        <apex:pageBlock title="Account Search">
            <apex:pageBlockSection columns="2">
                <apex:inputText value="{!searchTerm}" label="Search" />
                <apex:commandButton value="Search" action="{!doSearch}" reRender="resultsPanel" status="searchStatus" />
            </apex:pageBlockSection>

            <apex:actionStatus id="searchStatus">
                <apex:facet name="start">Searching...</apex:facet>
            </apex:actionStatus>

            <apex:outputPanel id="resultsPanel">
                <apex:pageBlockTable value="{!accounts}" var="acc" rendered="{!NOT(ISNULL(accounts))}">
                    <apex:column value="{!acc.Name}" />
                    <apex:column value="{!acc.Industry}" />
                    <apex:column value="{!acc.AnnualRevenue}" />
                </apex:pageBlockTable>
            </apex:outputPanel>
        </apex:pageBlock>
    </apex:form>
</apex:page>
```

## Standard Controllers

Standard controllers provide automatic CRUD operations for a single sObject without custom Apex.

```xml
<apex:page standardController="Account">
    <apex:form>
        <apex:pageBlock title="Edit Account" mode="edit">
            <apex:pageBlockButtons>
                <apex:commandButton value="Save" action="{!save}" />
                <apex:commandButton value="Cancel" action="{!cancel}" />
            </apex:pageBlockButtons>
            <apex:pageBlockSection>
                <apex:inputField value="{!Account.Name}" />
                <apex:inputField value="{!Account.Industry}" />
                <apex:inputField value="{!Account.Phone}" />
            </apex:pageBlockSection>
        </apex:pageBlock>
    </apex:form>
</apex:page>
```

Standard controller actions: `save`, `edit`, `delete`, `cancel`, `list`.

## Custom Controllers

Custom controllers are Apex classes that provide all logic for the page.

```apex
public with sharing class AccountSearchController {

    public String searchTerm { get; set; }
    public List<Account> accounts { get; private set; }

    public AccountSearchController() {
        accounts = new List<Account>();
    }

    public PageReference doSearch() {
        if (String.isBlank(searchTerm)) {
            ApexPages.addMessage(new ApexPages.Message(
                ApexPages.Severity.WARNING, 'Please enter a search term'));
            return null;
        }

        String likePattern = '%' + String.escapeSingleQuotes(searchTerm) + '%';
        accounts = [
            SELECT Id, Name, Industry, AnnualRevenue
            FROM Account
            WHERE Name LIKE :likePattern
            WITH SECURITY_ENFORCED
            LIMIT 100
        ];

        if (accounts.isEmpty()) {
            ApexPages.addMessage(new ApexPages.Message(
                ApexPages.Severity.INFO, 'No accounts found'));
        }
        return null;
    }
}
```

**Rules:**
- Always use `with sharing` on VF controllers
- Return `null` from action methods to stay on the same page
- Return a `PageReference` to redirect

## Controller Extensions

Extensions add functionality to standard or custom controllers without replacing them.

```apex
public with sharing class AccountExtension {

    private final Account account;

    public AccountExtension(ApexPages.StandardController stdController) {
        this.account = (Account) stdController.getRecord();
    }

    public List<Contact> getRelatedContacts() {
        return [
            SELECT Id, Name, Email, Phone
            FROM Contact
            WHERE AccountId = :account.Id
            WITH SECURITY_ENFORCED
        ];
    }

    public PageReference customSave() {
        try {
            upsert account;
            return new PageReference('/' + account.Id);
        } catch (DmlException e) {
            ApexPages.addMessages(e);
            return null;
        }
    }
}
```

```xml
<apex:page standardController="Account" extensions="AccountExtension">
    <!-- Can use both standard controller and extension methods -->
</apex:page>
```

Multiple extensions are supported. Methods resolve left to right, then standard controller:

```xml
<apex:page standardController="Account" extensions="ExtA,ExtB">
```

## ViewState Management

ViewState stores the page state between server round-trips. The limit is **170 KB**. Exceeding it causes a `ViewState size limit` error.

### ViewState Reduction Strategies

```apex
public with sharing class LargeDataController {

    // BAD -- large list stored in ViewState
    public List<Account> allAccounts { get; set; }

    // GOOD -- transient keyword excludes from ViewState
    transient public List<Account> allAccounts { get; set; }

    // GOOD -- lazy load only when needed
    public List<Account> getAccounts() {
        if (accounts == null) {
            accounts = [SELECT Id, Name FROM Account LIMIT 100];
        }
        return accounts;
    }
    private transient List<Account> accounts;
}
```

**ViewState rules:**
- Mark display-only data as `transient` (not included in ViewState)
- Minimize the number of properties with `{ get; set; }`
- Use pagination to limit records per page
- Avoid storing large collections; re-query when needed
- Use `apex:outputField` (read-only, no ViewState) instead of `apex:inputField` when editing is not needed
- Monitor ViewState size with the Development Mode footer

### Pagination Pattern

```apex
public with sharing class PaginatedController {

    private static final Integer PAGE_SIZE = 20;
    public Integer pageNumber { get; set; }
    transient public List<Account> accounts { get; set; }
    public Integer totalRecords { get; private set; }

    public PaginatedController() {
        pageNumber = 1;
        totalRecords = [SELECT COUNT() FROM Account];
        loadPage();
    }

    public void loadPage() {
        Integer offset = (pageNumber - 1) * PAGE_SIZE;
        accounts = [
            SELECT Id, Name, Industry
            FROM Account
            WITH SECURITY_ENFORCED
            ORDER BY Name
            LIMIT :PAGE_SIZE
            OFFSET :offset
        ];
    }

    public void nextPage() {
        pageNumber++;
        loadPage();
    }

    public void previousPage() {
        if (pageNumber > 1) pageNumber--;
        loadPage();
    }

    public Boolean getHasNext() {
        return (pageNumber * PAGE_SIZE) < totalRecords;
    }

    public Boolean getHasPrevious() {
        return pageNumber > 1;
    }
}
```

## JavaScript Remoting

JavaScript Remoting bypasses ViewState entirely by making direct Apex calls from JavaScript. Faster than `actionFunction` for AJAX operations.

```xml
<apex:page controller="RemotingController">
    <script>
        function searchAccounts(term) {
            Visualforce.remoting.Manager.invokeAction(
                '{!$RemoteAction.RemotingController.findAccounts}',
                term,
                function(result, event) {
                    if (event.status) {
                        // result is the returned data
                        renderResults(result);
                    } else {
                        console.error(event.message);
                    }
                },
                { escape: true, timeout: 30000 }
            );
        }
    </script>
</apex:page>
```

```apex
public with sharing class RemotingController {

    @RemoteAction
    public static List<Account> findAccounts(String searchTerm) {
        String likePattern = '%' + String.escapeSingleQuotes(searchTerm) + '%';
        return [
            SELECT Id, Name, Industry
            FROM Account
            WHERE Name LIKE :likePattern
            WITH SECURITY_ENFORCED
            LIMIT 50
        ];
    }
}
```

**Remoting rules:**
- Methods must be `static` and annotated with `@RemoteAction`
- Parameters and return types must be serializable
- No ViewState overhead
- Set `escape: true` to prevent XSS

## Action Functions

`apex:actionFunction` allows JavaScript to invoke controller methods with a server round-trip that includes ViewState.

```xml
<apex:actionFunction name="refreshData" action="{!refresh}" reRender="dataPanel" status="loadStatus" />

<script>
    // Call from JavaScript
    refreshData();
</script>
```

**When to use actionFunction vs Remoting:**

| Feature | actionFunction | JavaScript Remoting |
|---------|---------------|-------------------|
| ViewState | Included | Not included |
| Speed | Slower | Faster |
| Partial page update | Yes (reRender) | Manual DOM update |
| Return type | None (updates ViewState) | Any serializable type |

## When Visualforce Is Still Needed

| Scenario | Reason |
|----------|--------|
| PDF generation | `renderAs="pdf"` has no LWC equivalent |
| Classic email templates | Visualforce email templates for HTML emails |
| Salesforce Sites guest pages (legacy) | Some Sites implementations require VF |
| Complex print layouts | Server-rendered HTML for print |
| Legacy managed packages | Existing packages with VF pages |
| Custom buttons with VF pages | URL-based buttons pointing to VF pages |

### PDF Generation

```xml
<apex:page standardController="Account" extensions="InvoiceExtension"
           renderAs="pdf" applyBodyTag="false" showHeader="false">
    <head>
        <style type="text/css">
            body { font-family: Arial, sans-serif; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .header { font-size: 18px; font-weight: bold; margin-bottom: 20px; }
        </style>
    </head>
    <body>
        <div class="header">Invoice for {!Account.Name}</div>
        <table>
            <tr><th>Product</th><th>Quantity</th><th>Amount</th></tr>
            <apex:repeat value="{!lineItems}" var="item">
                <tr>
                    <td>{!item.Product__c}</td>
                    <td>{!item.Quantity__c}</td>
                    <td>{!item.Amount__c}</td>
                </tr>
            </apex:repeat>
        </table>
    </body>
</apex:page>
```

## VF Security

### CSRF Protection

Visualforce includes automatic CSRF protection via a hidden token in `apex:form`. Never bypass this.

```xml
<!-- GOOD -- automatic CSRF token -->
<apex:form>
    <apex:commandButton value="Save" action="{!save}" />
</apex:form>

<!-- BAD -- raw HTML form bypasses CSRF protection -->
<form method="POST" action="/apex/MyPage">
    <input type="submit" value="Save" />
</form>
```

### Clickjack Protection

Set the page header to prevent embedding in iframes from untrusted domains.

```xml
<!-- Prevent framing -->
<apex:page controller="MyController" showHeader="false">
    <!-- Page is protected by Salesforce clickjack settings -->
</apex:page>
```

Configure in Setup > Session Settings:
- **Enable clickjack protection for customer Visualforce pages with standard headers**
- **Enable clickjack protection for customer Visualforce pages with headers disabled**

### Output Encoding

```xml
<!-- Auto-encoded (safe) -->
<apex:outputText value="{!userInput}" />

<!-- Dangerous -- unescaped -->
<apex:outputText value="{!userInput}" escape="false" />
```

**Rule:** Never set `escape="false"` unless the content is sanitized and you have a documented reason.

## VF-to-LWC Migration Strategies

### Assessment Criteria

| Factor | Keep VF | Migrate to LWC |
|--------|---------|----------------|
| PDF generation | Yes | No (no LWC equivalent) |
| Actively developed | Migrate | Migrate |
| Simple data display | Migrate | Yes |
| Complex ViewState | Migrate | Yes (LWC has no ViewState) |
| Guest user pages | Evaluate | Yes (Experience Cloud LWC) |
| Classic email templates | Keep | Evaluate Lightning email |

### Migration Steps

1. **Inventory** -- List all VF pages, their controllers, and usage frequency
2. **Categorize** -- Mark each as Keep (PDF, email), Migrate, or Retire
3. **Extract logic** -- Move controller logic into service classes that both VF and LWC can call
4. **Build LWC** -- Create the LWC component calling the shared service
5. **Parallel run** -- Deploy LWC alongside VF, route users gradually
6. **Retire VF** -- Remove VF pages once LWC is validated

### Shared Service Layer

```apex
// Service class used by both VF controller and LWC Apex controller
public with sharing class AccountService {
    public static List<Account> searchAccounts(String term) {
        String likePattern = '%' + String.escapeSingleQuotes(term) + '%';
        return [
            SELECT Id, Name, Industry, AnnualRevenue
            FROM Account
            WHERE Name LIKE :likePattern
            WITH SECURITY_ENFORCED
            LIMIT 100
        ];
    }
}

// VF Controller
public with sharing class AccountSearchVFController {
    public String searchTerm { get; set; }
    transient public List<Account> accounts { get; set; }

    public void doSearch() {
        accounts = AccountService.searchAccounts(searchTerm);
    }
}

// LWC Apex Controller
public with sharing class AccountSearchLWCController {
    @AuraEnabled(cacheable=true)
    public static List<Account> searchAccounts(String term) {
        return AccountService.searchAccounts(term);
    }
}
```

## Anti-Patterns

1. **Exceeding 170KB ViewState.** Use `transient`, pagination, and remoting.
2. **SOQL in getters.** Getters can be called multiple times per page render. Cache results.
3. **Using `escape="false"` without sanitization.** XSS vulnerability.
4. **Raw HTML forms instead of `apex:form`.** Bypasses CSRF protection.
5. **Starting new VF pages.** Use LWC for all new development unless PDF generation or email templates are required.
6. **Hardcoded IDs in page references.** Use `{!$ObjectType.Account.keyPrefix}` or dynamic references.
7. **No error handling in controllers.** Always catch DML exceptions and display via `ApexPages.addMessages()`.
