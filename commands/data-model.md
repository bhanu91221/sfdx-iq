---
description: Analyze or design Salesforce data model with relationship mapping
---

# /data-model

Analyze an existing Salesforce data model or design a new one. For existing models: map relationships, identify data skew, and find missing indexes. For new designs: plan objects, relationships, record types, and external IDs.

## Workflow

1. **Determine mode**
   - Ask the user: analyze existing data model or design a new one
   - If analyzing: identify scope — specific objects or entire org
   - If designing: gather business requirements
   - Delegate to the **data-modeler** agent for domain-specific analysis

2. **Mode: Analyze existing data model**

   a. **Inventory objects**
   - Scan `force-app/main/default/objects/` for custom object definitions
   - For connected orgs, query `EntityDefinition` for standard and custom objects in use
   - For each object, record: API name, label, record count estimate, sharing model

   b. **Map relationships**
   - Identify all lookup and master-detail relationships
   - Build a relationship graph showing parent-child connections
   - Identify junction objects (objects with two master-detail relationships)
   - Map polymorphic lookups (e.g., `WhatId`, `WhoId`)
   - Calculate relationship depth: how many levels of parent-child nesting exist

   c. **Identify data skew risks**
   - Flag lookup fields where a single parent has an excessive number of child records
   - Common skew patterns: Account with millions of child records, single user as owner of many records
   - Check for record locking risks due to parent-child relationships
   - Identify objects with potential large data volumes (over 1M estimated records)

   d. **Check indexing and selectivity**
   - Identify custom fields marked as external IDs (automatically indexed)
   - Review SOQL queries in Apex for WHERE clause fields
   - Flag frequently queried fields that are not indexed or external IDs
   - Check for queries that would trigger full table scans

   e. **Detect design issues**
   - Objects with too many custom fields (approaching 800 limit)
   - Deep relationship hierarchies (more than 5 levels)
   - Missing validation rules on required business fields
   - Inconsistent naming conventions across objects and fields
   - Missing descriptions on objects and fields
   - Record types without corresponding page layouts

3. **Mode: Design new data model**

   a. **Gather requirements**
   - Ask for the business domain and use cases
   - Ask for the entities/objects needed and their descriptions
   - Ask for the relationships between entities
   - Ask about data volume expectations per object
   - Ask about sharing and visibility requirements

   b. **Design objects**
   - For each entity, define:
     - Object API name following naming conventions: `<Namespace>__<ObjectName>__c`
     - Label, plural label, description
     - Key custom fields with data types, lengths, required/optional
     - External ID fields for integration
     - Record types if different business processes exist
   - Recommend standard objects where appropriate: do not recreate Account, Contact, etc.

   c. **Design relationships**
   - Choose relationship type for each connection:
     - **Master-Detail**: Parent controls child sharing, cascade delete, roll-up summaries
     - **Lookup**: Independent sharing, no cascade delete, more flexible
     - **External Lookup**: For Salesforce Connect external objects
     - **Hierarchical**: Self-referencing (User only, or custom with lookup to same object)
   - Design junction objects for many-to-many relationships
   - Consider relationship limits: max 2 master-detail per object, max 40 relationships total

   d. **Plan sharing model**
   - Recommend OWD (Organization-Wide Defaults) per object
   - Design sharing rules if needed
   - Plan role hierarchy impact on data access
   - Consider Apex managed sharing for complex scenarios

   e. **Generate ERD**
   - Output a text-based entity relationship diagram
   - Show objects as blocks with key fields
   - Show relationships with cardinality notation (1:1, 1:N, N:M)
   - Group related objects together

4. **Generate report**
   - **Object inventory**: All objects with field counts and relationship counts
   - **Relationship map**: Text-based ERD or adjacency list
   - **Issues found** (analyze mode): Data skew, missing indexes, design problems
   - **Design document** (design mode): Object definitions, field specifications, relationship details
   - **Recommendations**: Improvements prioritized by impact

## Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--mode` | `analyze` or `design` | Prompt user |
| `--objects` | Comma-separated object API names to focus on | All objects |
| `--target-org` | Org alias for live analysis | Default org |
| `--output` | Output file for the report | Print to console |
| `--include-standard` | Include standard objects in analysis | `false` |

## Error Handling

- If no object metadata is found locally and no org is connected, request either source files or org access
- If an object name is invalid, warn and skip it
- If the relationship graph is too complex to display as text, break into subgraphs by domain
- If data volume queries fail (no org access), skip data skew analysis and note the limitation

## Example Usage

```
/data-model
/data-model --mode analyze --objects Account,Contact,Opportunity,Custom__c
/data-model --mode design
/data-model --mode analyze --target-org myOrg --include-standard
```
