# Metadata Coding Style Rules

## Object Naming

| Metadata Type | Convention | Example |
|--------------|-----------|---------|
| Custom Objects | PascalCase\_\_c | `Invoice_Line_Item__c` |
| Custom Fields | PascalCase\_\_c | `Total_Amount__c` |
| Custom Metadata Types | PascalCase\_\_mdt | `App_Config__mdt` |
| Platform Events | PascalCase\_\_e | `Order_Event__e` |
| Big Objects | PascalCase\_\_b | `Audit_Log__b` |
| External Objects | PascalCase\_\_x | `SAP_Order__x` |
| Custom Settings | PascalCase\_\_c | `Integration_Settings__c` |

## Field Naming

- Use descriptive field names that convey business meaning.
- Prefix related fields consistently: `Billing_Street__c`, `Billing_City__c`, `Billing_State__c`.
- Boolean fields: use `Is_` or `Has_` prefix — `Is_Active__c`, `Has_Open_Cases__c`.
- Date fields: suffix with `_Date` — `Renewal_Date__c`, `Last_Contact_Date__c`.
- ID/reference fields: suffix with `_Id` or use relationship name — `External_Order_Id__c`.

## API Name Stability

- Once an API name is deployed to production, NEVER change it.
- API names are referenced in Apex, SOQL, LWC, Flows, reports, and integrations.
- If a name is wrong, create a new field/object and migrate — don't rename.

## Label Standards

- Labels should be user-friendly: "Invoice Line Item" not "Invoice_Line_Item__c".
- Plural labels for objects: "Invoice Line Items".
- Help text is required for custom fields visible to end users.
- Description is required for all custom objects and fields.

## Record Type Naming

- Use PascalCase without underscores: `StandardAccount`, `PartnerAccount`.
- API names should match developer names exactly.
- Keep record type count minimal — use picklist values where possible.

## Validation Rule Naming

Pattern: `VR_ObjectName_Purpose`

Examples:
- `VR_Account_RequireIndustry`
- `VR_Opportunity_CloseDate_Future`
- `VR_Contact_EmailFormat`

Every validation rule MUST include an error message with the field name and expected format.

## Custom Label Naming

Pattern: `Module_Purpose`

Examples:
- `Account_ErrorRequired`
- `Integration_TimeoutMessage`
- `UI_ConfirmDelete`

Use custom labels for all user-facing text — never hardcode strings in Apex or LWC.
