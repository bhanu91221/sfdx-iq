---
name: scratch-org-management
description: Scratch org definition, creation, source push/pull, data seeding, org shapes, snapshots, and pooling strategies
origin: claude-sfdx-iq
---

# Scratch Org Management

## Overview

Scratch orgs are temporary, disposable Salesforce orgs used for development, testing, and CI. They are fully configurable through definition files, support source tracking, and can be created and destroyed in minutes. This skill covers definition files, lifecycle management, data seeding, and pooling strategies.

## Scratch Org Definition File

The `project-scratch-def.json` file defines the shape of a scratch org: edition, features, settings, and org preferences.

### Basic Definition

```json
{
  "orgName": "MyApp Dev Org",
  "edition": "Developer",
  "features": ["EnableSetPasswordInApi", "AuthorApex"],
  "settings": {
    "lightningExperienceSettings": {
      "enableS1DesktopEnabled": true
    },
    "securitySettings": {
      "passwordPolicies": {
        "enableSetPasswordInApi": true
      }
    },
    "mobileSettings": {
      "enableS1EncryptedStoragePref2": false
    }
  }
}
```

### Enterprise Definition with Features

```json
{
  "orgName": "MyApp Full Feature Org",
  "edition": "Enterprise",
  "features": [
    "Communities",
    "ServiceCloud",
    "LightningSalesConsole",
    "LightningServiceConsole",
    "ContactsToMultipleAccounts",
    "MultiCurrency",
    "PersonAccounts",
    "StateAndCountryPicklist"
  ],
  "settings": {
    "communitiesSettings": {
      "enableNetworksEnabled": true
    },
    "omniChannelSettings": {
      "enableOmniChannel": true
    },
    "caseSettings": {
      "systemUserEmail": "admin@example.com"
    },
    "languageSettings": {
      "enableTranslationWorkbench": true
    }
  },
  "hasSampleData": false
}
```

### Edition Comparison

| Feature | Developer | Enterprise | Group | Professional |
|---------|-----------|------------|-------|-------------|
| Custom objects | 400 | 400 | 5 | 50 |
| Apex/VF | Yes | Yes | No | No |
| Workflows | Yes | Yes | Limited | Limited |
| Sharing rules | Yes | Yes | No | No |
| Cost (against Dev Hub) | 1 active | 1 active | 1 active | 1 active |

## Scratch Org Lifecycle

### Creating Scratch Orgs

```bash
# Basic creation (default 7 days)
sf org create scratch --definition-file config/project-scratch-def.json \
  --target-dev-hub devhub --alias my-scratch --set-default

# With specific duration (max 30 days)
sf org create scratch --definition-file config/project-scratch-def.json \
  --target-dev-hub devhub --alias my-scratch --duration-days 14

# With namespace (for managed package dev)
sf org create scratch --definition-file config/project-scratch-def.json \
  --target-dev-hub devhub --alias my-scratch --namespace myns

# No ancestors (skip namespace ancestry check)
sf org create scratch --definition-file config/project-scratch-def.json \
  --target-dev-hub devhub --alias my-scratch --no-ancestors
```

### Source Push and Pull

```bash
# Push local source to scratch org
sf project deploy start --target-org my-scratch

# Pull changes from scratch org to local
sf project retrieve start --target-org my-scratch

# Check source tracking status
sf project deploy preview --target-org my-scratch
sf project retrieve preview --target-org my-scratch
```

### Source Tracking Conflicts

When both local and remote have changes to the same file:

```bash
# Preview conflicts
sf project deploy preview --target-org my-scratch

# Force push (overwrites remote)
sf project deploy start --target-org my-scratch --ignore-conflicts

# Force pull (overwrites local)
sf project retrieve start --target-org my-scratch --ignore-conflicts
```

### Opening and Managing Orgs

```bash
# Open scratch org in browser
sf org open --target-org my-scratch

# Open to specific page
sf org open --target-org my-scratch --path "lightning/setup/SetupOneHome/home"

# List all scratch orgs
sf org list --all

# Display org details
sf org display --target-org my-scratch

# Delete scratch org
sf org delete scratch --target-org my-scratch --no-prompt

# Generate password for scratch org user
sf org generate password --target-org my-scratch
```

## Data Seeding

### Export and Import Trees

```bash
# Export related records
sf data export tree \
  --query "SELECT Id, Name, (SELECT Id, FirstName, LastName FROM Contacts) FROM Account WHERE Type = 'Customer'" \
  --output-dir data/seed \
  --target-org source-org

# Import using plan file
sf data import tree --plan data/seed/Account-Contact-plan.json --target-org my-scratch
```

### Seed Script Pattern

Create a shell script that seeds reference data after org creation:

```bash
#!/bin/bash
# scripts/seed-data.sh

ORG_ALIAS=${1:-my-scratch}

echo "Seeding reference data..."
sf data import tree --plan data/seed/Account-plan.json --target-org $ORG_ALIAS
sf data import tree --plan data/seed/Product-plan.json --target-org $ORG_ALIAS

echo "Creating test users..."
sf apex run --file scripts/apex/create-test-users.apex --target-org $ORG_ALIAS

echo "Assigning permission sets..."
sf org assign permset --name MyApp_Admin --target-org $ORG_ALIAS
sf org assign permset --name MyApp_User --target-org $ORG_ALIAS

echo "Seed complete."
```

### Anonymous Apex for Complex Seeding

```apex
// scripts/apex/create-test-users.apex
List<User> testUsers = new List<User>();
Profile stdProfile = [SELECT Id FROM Profile WHERE Name = 'Standard User' LIMIT 1];

for (Integer i = 1; i <= 5; i++) {
    testUsers.add(new User(
        FirstName = 'Test',
        LastName = 'User' + i,
        Email = 'testuser' + i + '@example.com',
        Username = 'testuser' + i + '@example.com.' + UserInfo.getOrganizationId(),
        Alias = 'tu' + i,
        ProfileId = stdProfile.Id,
        EmailEncodingKey = 'UTF-8',
        LanguageLocaleKey = 'en_US',
        LocaleSidKey = 'en_US',
        TimeZoneSidKey = 'America/Los_Angeles'
    ));
}
insert testUsers;
```

## Org Shapes

Org shapes capture the configuration of a source org and use it to create scratch orgs with the same shape.

```bash
# Create an org shape from a source org
sf org create shape --target-org source-org

# List org shapes
sf org list shape --target-dev-hub devhub

# Use org shape in scratch def
# In project-scratch-def.json:
# { "sourceOrg": "00D..." }

# Delete an org shape
sf org delete shape --target-org source-org --no-prompt
```

**When to use org shapes:**
- Scratch org must match production configuration exactly
- Complex feature/setting combinations are hard to replicate in JSON
- Need to capture org-specific customizations

## Org Snapshots

Snapshots capture a fully configured scratch org at a point in time, including pushed source and seeded data.

```bash
# Create snapshot from a prepared scratch org
sf org create snapshot --source-org prepared-scratch \
  --snapshot-name "baseline-v1" --description "Baseline with seed data" \
  --target-dev-hub devhub

# Create scratch org from snapshot
sf org create scratch --snapshot "baseline-v1" \
  --target-dev-hub devhub --alias new-scratch

# List snapshots
sf org list snapshot --target-dev-hub devhub

# Delete snapshot
sf org delete snapshot --snapshot-name "baseline-v1" --target-dev-hub devhub
```

**Snapshot vs Shape:**

| Aspect | Org Shape | Org Snapshot |
|--------|-----------|-------------|
| Source | Production or sandbox | Scratch org |
| Includes data | No | Yes |
| Includes source | Config only | Full source + data |
| Creation time | Fast | Depends on size |
| Use case | Match prod config | Pre-built dev environment |

## Permission Set Assignment Automation

```bash
# Assign single permission set
sf org assign permset --name MyApp_Admin --target-org my-scratch

# Assign multiple permission sets
sf org assign permset --name MyApp_Admin --name MyApp_Integration --target-org my-scratch

# Assign permission set group
sf org assign permsetgroup --name MyApp_Full_Access --target-org my-scratch
```

### Automation Script for New Orgs

```bash
#!/bin/bash
# scripts/setup-scratch.sh

ALIAS=${1:-dev-scratch}
DURATION=${2:-14}

echo "Creating scratch org: $ALIAS"
sf org create scratch \
  --definition-file config/project-scratch-def.json \
  --target-dev-hub devhub \
  --alias $ALIAS \
  --duration-days $DURATION \
  --set-default

echo "Pushing source..."
sf project deploy start --target-org $ALIAS

echo "Assigning permission sets..."
sf org assign permset --name MyApp_Admin --target-org $ALIAS
sf org assign permset --name MyApp_User --target-org $ALIAS

echo "Seeding data..."
sf data import tree --plan data/seed/Account-plan.json --target-org $ALIAS

echo "Opening org..."
sf org open --target-org $ALIAS

echo "Setup complete for $ALIAS"
```

## Org Pooling Strategies

For teams and CI pipelines, maintaining a pool of pre-built scratch orgs reduces wait times.

### Pool Architecture

```
Pool Manager (scheduled job or CI cron)
  |
  +-- Creates N scratch orgs in advance
  +-- Pushes source to each
  +-- Seeds data
  +-- Assigns permission sets
  +-- Marks as "available" in a tracking system
  |
Developer / CI Job
  +-- Claims an available org from the pool
  +-- Uses it for development or test run
  +-- Returns or deletes when done
```

### Pool Sizing Guidelines

| Team Size | Active Pool | Buffer | Total |
|-----------|------------|--------|-------|
| 1-3 devs | 3-5 | 2 | 5-7 |
| 4-8 devs | 8-12 | 4 | 12-16 |
| CI pipeline | Per job concurrency | 2x | 2x concurrency |

### Scratch Org Limits

| Limit | Default |
|-------|---------|
| Daily scratch orgs | 6 per Dev Hub |
| Active scratch orgs | 3-40 (depends on edition) |
| Max duration | 30 days |
| Namespace scratch orgs | Same limits apply |

## Anti-Patterns to Avoid

1. **Long-lived scratch orgs** -- Scratch orgs are disposable; do not treat them as persistent sandboxes
2. **Manual configuration** -- Everything should be in the definition file or source; never configure manually
3. **No source tracking** -- Always push/pull; do not use retrieve/deploy for scratch org development
4. **Skipping data seeding** -- Automate data setup to ensure consistent development environments
5. **Single definition file** -- Use multiple definitions for different scenarios (minimal, full-feature, CI)
6. **Ignoring org limits** -- Monitor active scratch org count and clean up expired orgs regularly
