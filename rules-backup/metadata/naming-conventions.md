---
paths:
  - "**/*-meta.xml"
  - "**/*.object-meta.xml"
  - "**/*.field-meta.xml"
  - "**/*.permissionset-meta.xml"
---

# Metadata Naming Conventions

## Custom Objects

Use PascalCase with underscores separating words. Always end with `__c` for custom objects:

```
Invoice__c
Invoice_Line_Item__c
Payment_Schedule__c
Employee_Review__c
```

Avoid abbreviations unless universally understood. Use full descriptive names:

```
// Good
Customer_Satisfaction_Survey__c
Order_Fulfillment__c

// Bad
Cust_Sat_Surv__c
OrdFul__c
```

## Custom Fields

PascalCase with `__c` suffix. Field names should describe the data they hold:

```
// Text and picklist fields
Account.Industry_Segment__c
Contact.Preferred_Language__c
Opportunity.Competitor_Name__c

// Relationship fields (Lookup/Master-Detail)
Invoice__c.Account__c
Invoice_Line_Item__c.Invoice__c
Case.Escalated_To__c

// Formula and rollup fields - indicate the type
Account.Total_Revenue__c          (rollup summary)
Opportunity.Days_Since_Created__c (formula)
Contact.Full_Name__c              (formula)

// Boolean fields - use Is_ or Has_ prefix
Account.Is_Active__c
Contact.Has_Opted_In__c
Opportunity.Is_High_Priority__c
```

## Apex Classes

PascalCase with no suffix. Use descriptive names that indicate purpose:

```
// Service classes
AccountService
OpportunityPricingService
EmailNotificationService

// Controller classes
AccountController
InvoiceListController

// Selector/query classes
AccountSelector
ContactQueryService

// Domain classes
Opportunities
InvoiceLineItems

// Utility classes
StringUtils
DateCalculator
SObjectHelper

// Trigger handlers
AccountTriggerHandler
OpportunityTriggerHandler

// Batch and queueable classes
AccountCleanupBatch
LeadAssignmentQueueable
DailyReportSchedulable

// Exception classes
InvoiceException
PaymentProcessingException
```

## Triggers

One trigger per object. Name format: `ObjectNameTrigger`:

```
AccountTrigger
ContactTrigger
OpportunityTrigger
Invoice__cTrigger
```

Never create multiple triggers on the same object. Use a handler pattern:

```java
// AccountTrigger.trigger
trigger AccountTrigger on Account (before insert, before update, after insert, after update) {
    AccountTriggerHandler handler = new AccountTriggerHandler();
    handler.run();
}
```

## Test Classes

Test class name format: `ClassNameTest`:

```
AccountServiceTest
OpportunityTriggerHandlerTest
EmailNotificationServiceTest
AccountCleanupBatchTest
StringUtilsTest
```

Test method naming -- describe the scenario:

```java
@IsTest
static void shouldCreateInvoiceWhenOpportunityClosedWon() { }

@IsTest
static void shouldThrowExceptionWhenAmountIsNegative() { }

@IsTest
static void shouldBulkProcessTwoHundredRecords() { }
```

## Permission Sets

Prefix with `PS_` followed by the purpose:

```
PS_Invoice_Manager
PS_API_Integration_User
PS_Sales_Console_Access
PS_Sensitive_Data_Viewer
PS_Case_Escalation
```

Permission Set Groups:

```
PSG_Sales_Representative
PSG_Service_Agent
PSG_System_Administrator
```

## Custom Labels

Format: `Module_Purpose` using PascalCase:

```
Invoice_ErrorAmountRequired
Invoice_SuccessCreated
Account_WarningDuplicateFound
Common_ButtonSave
Common_ButtonCancel
Common_ErrorGeneric
Email_SubjectWelcome
Validation_FieldRequired
```

## Validation Rules

Format: `VR_ObjectName_Purpose`:

```
VR_Account_RequireIndustry
VR_Contact_ValidateEmail
VR_Opportunity_CloseRequiresAmount
VR_Invoice_PreventNegativeAmount
VR_Case_EscalationRequiresReason
```

## Flows

Format: `ObjectName_TriggerType_Purpose`:

```
// Record-triggered flows
Account_BeforeSave_DefaultFields
Opportunity_AfterSave_CreateTasks
Case_AfterSave_EscalationNotify
Lead_BeforeSave_Enrichment

// Screen flows
Account_Screen_MergeWizard
Case_Screen_EscalationForm
Order_Screen_ReturnProcess

// Scheduled flows
Lead_Scheduled_StaleCleanup
Opportunity_Scheduled_ForecastUpdate

// Autolaunched (subflows)
Utility_SendNotification
Utility_LogError
Utility_CalculateBusinessDays
```

## Other Metadata Types

```
// Lightning Web Components - camelCase directory name
lwc/
  accountSummary/
  invoiceLineEditor/
  contactSearchResults/

// Aura Components - camelCase
aura/
  AccountQuickAction/
  InvoiceModal/

// Custom Metadata Types - PascalCase with __mdt suffix
Integration_Setting__mdt
Approval_Threshold__mdt
Tax_Rate__mdt

// Custom Settings
App_Configuration__c (hierarchy)
Feature_Flag__c (hierarchy)

// Platform Events - PascalCase with __e suffix
Order_Event__e
Payment_Notification__e

// Record Types - PascalCase
Account.Enterprise
Account.Small_Business
Case.Technical_Support
Case.Billing_Inquiry

// Page Layouts - ObjectName-RecordType Layout
Account-Enterprise Layout
Case-Technical Support Layout

// Apps
Sales_Console
Service_Hub
Invoice_Manager
```

## Summary Table

| Metadata Type | Format | Example |
|---------------|--------|---------|
| Custom Object | PascalCase__c | `Invoice_Line_Item__c` |
| Custom Field | PascalCase__c | `Is_Active__c` |
| Apex Class | PascalCase | `AccountService` |
| Trigger | ObjectNameTrigger | `AccountTrigger` |
| Test Class | ClassNameTest | `AccountServiceTest` |
| Permission Set | PS_Purpose | `PS_Invoice_Manager` |
| Custom Label | Module_Purpose | `Invoice_ErrorAmountRequired` |
| Validation Rule | VR_Object_Purpose | `VR_Account_RequireIndustry` |
| Flow | Object_Type_Purpose | `Account_BeforeSave_DefaultFields` |
| LWC | camelCase | `accountSummary` |
| Custom Metadata | PascalCase__mdt | `Tax_Rate__mdt` |
| Platform Event | PascalCase__e | `Order_Event__e` |
