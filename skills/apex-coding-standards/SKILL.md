---
name: apex-coding-standards
description: Naming conventions, documentation standards, code structure rules, and PMD compliance for Apex
origin: claude-sfdx-iq
user-invocable: false
tokens: 2183
domain: apex
---

# Apex Coding Standards

## Naming Conventions

### Classes

Use **PascalCase** for all class names. The name should describe the responsibility.

| Type | Convention | Example |
|------|-----------|---------|
| Service | `{Object}Service` | `AccountService` |
| Selector | `{Object}sSelector` | `AccountsSelector` |
| Domain | `{Object}s` (plural) | `Accounts` |
| Controller | `{Feature}Controller` | `InvoiceController` |
| Trigger Handler | `{Object}TriggerHandler` | `AccountTriggerHandler` |
| Batch | `{Action}{Object}Batch` | `CleanupAccountBatch` |
| Schedulable | `{Action}{Object}Scheduler` | `CleanupAccountScheduler` |
| Test | `{ClassUnderTest}Test` | `AccountServiceTest` |
| Exception | `{Name}Exception` | `ValidationException` |
| Interface | `I{Name}` | `INotificationSender` |
| Utility/Helper | `{Domain}Util` or `{Domain}Helper` | `DateUtil` |

### Methods

Use **camelCase**. Methods should start with a verb.

```apex
public void activateAccount(Id accountId) { }
public List<Account> getActiveAccounts() { }
public Boolean isEligibleForDiscount(Opportunity opp) { }
private void validateRequiredFields(Account acc) { }
```

**Naming patterns:**
- `get*` -- return data
- `set*` -- assign a value
- `is*` / `has*` / `can*` -- return Boolean
- `validate*` -- throw or addError on failure
- `process*` / `handle*` -- perform a complex operation
- `create*` / `build*` -- construct and return an object

### Variables

Use **camelCase** for all local variables, parameters, and instance variables.

```apex
String accountName = 'Acme';
List<Contact> relatedContacts = new List<Contact>();
Map<Id, Account> accountsById = new Map<Id, Account>();
Integer retryCount = 0;
```

**Collection naming:**
- Lists: plural noun (`accounts`, `lineItems`)
- Maps: `{value}By{Key}` (`accountsById`, `contactsByEmail`)
- Sets: `{item}Ids` or `{item}Set` (`accountIds`, `processedRecords`)

### Constants

Use **UPPER_SNAKE_CASE** for all constants. Define them as `static final`.

```apex
private static final Integer MAX_RETRY_COUNT = 3;
private static final String STATUS_ACTIVE = 'Active';
private static final Decimal DEFAULT_TAX_RATE = 0.08;
public static final String ERROR_MISSING_NAME = 'Account name is required.';
```

**No magic numbers or strings.** Every literal that has business meaning must be a named constant.

```apex
// BAD
if (retryCount > 3) { ... }
if (acc.Status__c == 'Active') { ... }

// GOOD
if (retryCount > MAX_RETRY_COUNT) { ... }
if (acc.Status__c == STATUS_ACTIVE) { ... }
```

## ApexDoc Standards

Every public and global method and class must have ApexDoc comments.

```apex
/**
 * @description Service class for Account-related business operations.
 *              Handles activation, deactivation, and ownership transfers.
 * @author Your Name
 * @date 2024-01-15
 */
public with sharing class AccountService {

    /**
     * @description Activates the given accounts by setting status and date fields.
     *              Sends notification to account owners on completion.
     * @param accountIds Set of Account IDs to activate
     * @return List of Database.SaveResult from the update
     * @throws AccountServiceException if any account is already active
     */
    public static List<Database.SaveResult> activateAccounts(Set<Id> accountIds) {
        // implementation
    }
}
```

**Required tags:**
- `@description` -- always; explain purpose, not implementation
- `@param` -- one per parameter, describe expected values
- `@return` -- if non-void; describe what is returned and when it may be null
- `@throws` -- if the method can throw; describe the condition

**Optional tags:**
- `@author` -- on class-level doc
- `@date` -- on class-level doc
- `@see` -- reference to related class or method
- `@example` -- usage example for complex APIs

## Class Structure

Organize class members in this order:

```apex
public with sharing class AccountService {

    // 1. Constants
    private static final String STATUS_ACTIVE = 'Active';

    // 2. Static variables
    private static Set<Id> processedIds = new Set<Id>();

    // 3. Instance variables
    private IAccountSelector selector;

    // 4. Constructors
    public AccountService() {
        this.selector = new AccountsSelector();
    }

    // 5. Public methods
    public void activateAccounts(Set<Id> ids) { }

    // 6. Private methods
    private void validateAccounts(List<Account> accounts) { }

    // 7. Inner classes / interfaces / enums
    public class AccountServiceException extends Exception { }
}
```

## Method Length and Complexity

- **Maximum method length: 50 lines** (excluding comments and blank lines)
- **Maximum class length: 500 lines** -- split into helper classes if larger
- **Maximum parameters: 4** -- use a wrapper class for more
- **Cyclomatic complexity: 10 or less** per method
- **One level of nesting preferred, two maximum** for loops and conditionals

```apex
// BAD -- deeply nested
for (Account acc : accounts) {
    if (acc.Status__c == 'Active') {
        for (Contact con : acc.Contacts) {
            if (con.Email != null) {
                // logic buried three levels deep
            }
        }
    }
}

// GOOD -- extract methods
List<Account> activeAccounts = filterActive(accounts);
List<Contact> contactsWithEmail = getContactsWithEmail(activeAccounts);
processContacts(contactsWithEmail);
```

## PMD Rules for Apex

The following PMD rules must be satisfied. Configure them in your `.pmd/apex-ruleset.xml`.

### Critical (must fix)

| Rule | Description |
|------|-------------|
| `ApexCRUDViolation` | Missing CRUD/FLS checks before DML |
| `ApexSOQLInjection` | Dynamic SOQL with unescaped user input |
| `ApexSharingViolations` | Class missing sharing keyword |
| `AvoidDmlStatementsInLoops` | DML inside a loop |
| `AvoidSoqlInLoops` | SOQL inside a loop |
| `OperationWithLimitsInLoop` | Limits-consuming operation in a loop |

### Major (should fix)

| Rule | Description |
|------|-------------|
| `CyclomaticComplexity` | Method complexity above threshold |
| `ExcessiveParameterList` | More than 4 parameters |
| `ExcessiveClassLength` | Class exceeds 500 lines |
| `NcssMethodCount` | Method exceeds 50 statements |
| `AvoidGlobalModifier` | Use `public` unless building a managed package |
| `EmptyCatchBlock` | Catch block with no handling |

### Minor (nice to fix)

| Rule | Description |
|------|-------------|
| `ApexDoc` | Missing documentation on public methods |
| `FieldNamingConventions` | Variable naming does not match convention |
| `OneDeclarationPerLine` | Multiple declarations on same line |
| `IfStmtsMustUseBraces` | If/else without braces |

## Additional Standards

### Sharing Keywords

Every class must declare a sharing keyword. No exceptions.

```apex
public with sharing class MyService { }         // Default for most classes
public without sharing class SystemService { }   // Justified elevated access
public inherited sharing class MySelector { }    // Inherit caller's context
```

### Access Modifiers

- Use the most restrictive modifier possible
- `public` for API methods
- `private` for internal methods
- `@TestVisible private` for methods that need test access but are not API
- Avoid `global` unless building a managed package or `@RestResource`

### Null Safety

Always handle null inputs defensively.

```apex
public static void processAccounts(List<Account> accounts) {
    if (accounts == null || accounts.isEmpty()) {
        return;
    }
    // proceed
}
```

### String Comparison

Use `String.isBlank()` and `String.isNotBlank()` instead of null and empty checks.

```apex
// BAD
if (name != null && name != '') { }

// GOOD
if (String.isNotBlank(name)) { }
```

### Ternary Usage

Use ternary for simple assignments only. Complex logic belongs in if/else.

```apex
// OK
String label = isActive ? 'Active' : 'Inactive';

// NOT OK -- too complex for ternary
String msg = (acc.Type == 'Partner' && acc.Status__c == 'Active')
    ? 'Active Partner'
    : (acc.Type == 'Customer' ? 'Customer' : 'Other');
```

## Code Review Checklist

Before submitting code for review, verify:

- [ ] All classes have sharing keywords
- [ ] All public methods have ApexDoc
- [ ] No magic numbers or strings
- [ ] No SOQL or DML in loops
- [ ] Method length under 50 lines
- [ ] Class length under 500 lines
- [ ] Constants use UPPER_SNAKE_CASE
- [ ] Methods use camelCase verbs
- [ ] Classes use PascalCase
- [ ] Null inputs handled defensively
- [ ] PMD scan passes with zero critical violations
