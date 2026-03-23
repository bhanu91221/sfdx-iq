---
name: permission-model
description: Salesforce permission model including Permission Sets, sharing rules, OWD, custom permissions, and Apex managed sharing
origin: claude-sfdx-iq
user-invocable: false
tokens: 3223
domain: security
---

# Permission Model

## Permission Sets over Profiles

Profiles grant the minimum baseline. Permission Sets add incremental access.

### Why Permission Sets

```
1. Profiles: ONE per user (rigid, leads to profile proliferation)
2. Permission Sets: MANY per user (composable, flexible)
3. Profiles for: login hours, IP ranges, page layout assignment, default record type
4. Permission Sets for: object CRUD, field access, Apex class access, system permissions
```

### Permission Set Structure

```xml
<!-- permissionsets/Sales_Extended.permissionset-meta.xml -->
<PermissionSet xmlns="http://soap.sforce.com/2006/04/metadata">
    <label>Sales Extended</label>
    <description>Extended permissions for sales operations</description>
    <hasActivationRequired>false</hasActivationRequired>

    <!-- Object Permissions -->
    <objectPermissions>
        <object>Opportunity</object>
        <allowCreate>true</allowCreate>
        <allowRead>true</allowRead>
        <allowEdit>true</allowEdit>
        <allowDelete>false</allowDelete>
        <viewAllRecords>false</viewAllRecords>
        <modifyAllRecords>false</modifyAllRecords>
    </objectPermissions>

    <!-- Field Permissions -->
    <fieldPermissions>
        <field>Opportunity.Discount__c</field>
        <readable>true</readable>
        <editable>true</editable>
    </fieldPermissions>

    <!-- Apex Class Access -->
    <classAccesses>
        <apexClass>OpportunityService</apexClass>
        <enabled>true</enabled>
    </classAccesses>

    <!-- Tab Visibility -->
    <tabSettings>
        <tab>Opportunity</tab>
        <visibility>Visible</visibility>
    </tabSettings>
</PermissionSet>
```

## Permission Set Groups

Bundle related Permission Sets for role-based assignment.

```xml
<!-- permissionsetgroups/Sales_Manager.permissionsetgroup-meta.xml -->
<PermissionSetGroup xmlns="http://soap.sforce.com/2006/04/metadata">
    <label>Sales Manager</label>
    <description>All permissions needed for sales managers</description>
    <permissionSets>
        <permissionSet>Sales_Base</permissionSet>
        <permissionSet>Sales_Extended</permissionSet>
        <permissionSet>Report_Builder</permissionSet>
        <permissionSet>Dashboard_Viewer</permissionSet>
    </permissionSets>
    <status>Updated</status>
</PermissionSetGroup>
```

### Permission Set Group Benefits

```
1. Assign one group instead of multiple permission sets
2. Combined permissions calculated and cached by platform
3. Easier to audit: "What does a Sales Manager have?"
4. Can include Muting Permission Sets to restrict
5. Session-based Permission Sets for temporary elevation
```

## Muting Permission Sets

Remove specific permissions from a Permission Set Group without modifying individual sets.

```xml
<!-- permissionsets/Mute_Delete_Opportunity.permissionset-meta.xml -->
<PermissionSet xmlns="http://soap.sforce.com/2006/04/metadata">
    <label>Mute Delete Opportunity</label>
    <description>Removes Opportunity delete from Sales Manager group</description>

    <objectPermissions>
        <object>Opportunity</object>
        <allowDelete>true</allowDelete>
        <!-- Only the permission to mute is set to true -->
    </objectPermissions>
</PermissionSet>
```

### How Muting Works

```
Permission Set Group: Sales Manager
  ├── Sales_Base (includes Opportunity Delete)
  ├── Sales_Extended
  └── Muting: Mute_Delete_Opportunity

Result: Users in this group have all Sales_Base + Sales_Extended permissions
        EXCEPT Opportunity Delete
```

## Custom Permissions

### Define Custom Permission

```xml
<!-- customPermissions/Can_Approve_Large_Discounts.customPermission-meta.xml -->
<CustomPermission xmlns="http://soap.sforce.com/2006/04/metadata">
    <label>Can Approve Large Discounts</label>
    <description>Allows approval of discounts over 30%</description>
    <isLicensed>false</isLicensed>
</CustomPermission>
```

### Assign to Permission Set

```xml
<!-- In permissionset XML -->
<customPermissions>
    <name>Can_Approve_Large_Discounts</name>
    <enabled>true</enabled>
</customPermissions>
```

### Check in Apex

```apex
public with sharing class DiscountService {

    public static Boolean canApproveDiscount(Decimal discountPercent) {
        if (discountPercent <= 30) {
            return true; // All users can approve small discounts
        }

        // Check custom permission for large discounts
        return FeatureManagement.checkPermission('Can_Approve_Large_Discounts');
    }

    public static void applyDiscount(Id opportunityId, Decimal discount) {
        if (!canApproveDiscount(discount)) {
            throw new InsufficientAccessException(
                'You do not have permission to approve discounts over 30%.'
            );
        }
        // Apply the discount
    }
}
```

### Check in Flow

```
Decision Element: "Can User Approve Large Discount?"
  Condition: {!$Permission.Can_Approve_Large_Discounts} = true
```

### Check in Validation Rule

```
IF(
    Discount__c > 0.30,
    NOT($Permission.Can_Approve_Large_Discounts),
    false
)
```

## OWD Design (Most Restrictive)

### OWD Settings

| Setting | Meaning |
|---------|---------|
| `Private` | Only owner and users above in hierarchy can see |
| `Public Read Only` | All users can see, only owner can edit |
| `Public Read/Write` | All users can see and edit |
| `Public Read/Write/Transfer` | All can see, edit, and transfer (Cases, Leads) |
| `Controlled by Parent` | Detail objects inherit from master |

### OWD Design Principle

```
Set OWD to the MOST RESTRICTIVE level needed by any user.
Then OPEN UP access using:
  1. Role Hierarchy (vertical)
  2. Sharing Rules (horizontal)
  3. Teams (manual)
  4. Apex Managed Sharing (programmatic)
  5. Territory Management (for Account-based)
```

### Common OWD Configuration

```
Account:          Private       (sales reps see only their accounts)
Contact:          Controlled by Parent
Opportunity:      Private       (sales reps see only their deals)
Case:             Private       (support agents see only assigned cases)
Lead:             Public Read/Write/Transfer (all sales can work leads)
Campaign:         Public Read Only
```

## Sharing Rules

### Ownership-Based Sharing Rule

```xml
<!-- Share accounts owned by West region with East region -->
<SharingOwnerRule>
    <fullName>Account.West_Shares_With_East</fullName>
    <sharedTo>
        <role>East_Sales</role>
    </sharedTo>
    <sharedFrom>
        <role>West_Sales</role>
    </sharedFrom>
    <accessLevel>Read</accessLevel>
</SharingOwnerRule>
```

### Criteria-Based Sharing Rule

```xml
<!-- Share high-value accounts with leadership -->
<SharingCriteriaRule>
    <fullName>Account.High_Value_To_Leadership</fullName>
    <sharedTo>
        <role>VP_Sales</role>
    </sharedTo>
    <criteriaItems>
        <field>AnnualRevenue</field>
        <operation>greaterThan</operation>
        <value>5000000</value>
    </criteriaItems>
    <accessLevel>Read</accessLevel>
</SharingCriteriaRule>
```

## Role Hierarchy

```
CEO
├── VP Sales
│   ├── Regional Manager (West)
│   │   ├── Sales Rep 1
│   │   └── Sales Rep 2
│   └── Regional Manager (East)
│       ├── Sales Rep 3
│       └── Sales Rep 4
├── VP Support
│   └── Support Manager
│       ├── Agent 1
│       └── Agent 2
└── VP Engineering

Rule: Users above in hierarchy ALWAYS have at least Read access
      to records owned by users below them (when "Grant Access Using Hierarchies"
      is enabled on the object).
```

## Manual Sharing

```apex
// Share a record with a specific user
AccountShare share = new AccountShare();
share.AccountId = accountId;
share.UserOrGroupId = userId;
share.AccountAccessLevel = 'Edit';
share.OpportunityAccessLevel = 'Read'; // Required for Account
share.CaseAccessLevel = 'None';
share.RowCause = Schema.AccountShare.RowCause.Manual;
insert share;
```

## Apex Managed Sharing

Programmatic sharing that survives ownership changes.

### Setup Sharing Reason

```xml
<!-- objects/Account.object -->
<sharingReasons>
    <fullName>Team_Assignment__c</fullName>
    <label>Team Assignment</label>
</sharingReasons>
```

### Create Apex Sharing

```apex
public with sharing class AccountSharingService {

    public static void shareWithTeam(Id accountId, Set<Id> teamMemberIds) {
        List<AccountShare> shares = new List<AccountShare>();

        for (Id userId : teamMemberIds) {
            AccountShare share = new AccountShare();
            share.AccountId = accountId;
            share.UserOrGroupId = userId;
            share.AccountAccessLevel = 'Edit';
            share.OpportunityAccessLevel = 'Read';
            share.RowCause = Schema.AccountShare.RowCause.Team_Assignment__c;
            shares.add(share);
        }

        // Use Database.insert to handle partial failures
        Database.SaveResult[] results = Database.insert(shares, false);
        for (Database.SaveResult sr : results) {
            if (!sr.isSuccess()) {
                for (Database.Error err : sr.getErrors()) {
                    Logger.error('Sharing failed: ' + err.getMessage());
                }
            }
        }
    }

    public static void removeTeamSharing(Id accountId, Set<Id> userIds) {
        List<AccountShare> existing = [
            SELECT Id FROM AccountShare
            WHERE AccountId = :accountId
            AND UserOrGroupId IN :userIds
            AND RowCause = :Schema.AccountShare.RowCause.Team_Assignment__c
        ];
        delete existing;
    }
}
```

### Apex Managed Sharing Benefits

```
1. Custom RowCause: your sharing reason is preserved
2. Survives ownership changes (unlike manual sharing)
3. Only deletable by code using the same RowCause
4. Full audit trail
5. Supports complex sharing logic (territory, team, account plan)
```

## Territory Management Considerations

```
When to use Territory Management:
- Account-based access model
- Geographic or industry-based territories
- Users need access to accounts in their territory
- Complex territory hierarchies with overlapping rules

Territory vs Role Hierarchy:
- Role hierarchy: user-centric (who reports to whom)
- Territory: account-centric (which accounts belong where)
- Users can be in multiple territories
- Territories provide separate sharing path from roles
```

## Permission Verification in Apex

```apex
public with sharing class SecurityUtils {

    // Check object-level access
    public static Boolean canCreateAccount() {
        return Schema.sObjectType.Account.isCreateable();
    }

    // Check field-level access
    public static Boolean canEditAccountRevenue() {
        return Schema.sObjectType.Account.fields.AnnualRevenue.isUpdateable();
    }

    // Check record access
    public static Boolean canEditRecord(Id recordId) {
        UserRecordAccess access = [
            SELECT HasEditAccess
            FROM UserRecordAccess
            WHERE UserId = :UserInfo.getUserId()
            AND RecordId = :recordId
            LIMIT 1
        ];
        return access.HasEditAccess;
    }

    // WITH SECURITY_ENFORCED (recommended)
    public static List<Account> getAccounts() {
        return [
            SELECT Id, Name, AnnualRevenue
            FROM Account
            WITH SECURITY_ENFORCED
            LIMIT 100
        ];
    }

    // stripInaccessible for DML
    public static void updateAccounts(List<Account> accounts) {
        SObjectAccessDecision decision = Security.stripInaccessible(
            AccessType.UPDATABLE, accounts
        );
        update decision.getRecords();
    }
}
```

## Decision Matrix: Access Mechanism

| Requirement | Mechanism |
|-------------|-----------|
| Baseline object/field access | Profile (minimum) + Permission Sets |
| Composable role-based access | Permission Set Groups |
| Feature toggles | Custom Permissions |
| Restrict within a group | Muting Permission Sets |
| Vertical access (manager sees team data) | Role Hierarchy |
| Horizontal access (peer teams) | Sharing Rules |
| Programmatic complex sharing | Apex Managed Sharing |
| Account-territory based | Territory Management |
| Temporary elevated access | Session-based Permission Sets |
| Record-level audit | UserRecordAccess query |
