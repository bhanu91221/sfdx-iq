---
description: Create and load sample data into a Salesforce org
---

# /data-seed

Generate sample data scripts and load test/demo data into a scratch org or sandbox.

## Workflow

1. **Determine data strategy**
   - Ask the user what objects need sample data
   - Identify relationships and dependency order (parent objects first)
   - Determine record counts per object

2. **Generate data plan**
   Create a data import plan file:
   ```json
   [
     {
       "sobject": "Account",
       "saveRefs": true,
       "resolveRefs": false,
       "files": ["data/Account.json"]
     },
     {
       "sobject": "Contact",
       "saveRefs": false,
       "resolveRefs": true,
       "files": ["data/Contact.json"]
     }
   ]
   ```

3. **Generate sample records**
   Create JSON data files with realistic sample data:
   ```json
   {
     "records": [
       {
         "attributes": { "type": "Account", "referenceId": "AccRef1" },
         "Name": "Acme Corporation",
         "Industry": "Technology",
         "AnnualRevenue": 5000000
       }
     ]
   }
   ```
   - Include all required fields
   - Use referenceIds for cross-object relationships
   - Generate realistic (not lorem ipsum) data

4. **Load data**
   ```bash
   sf data import tree --plan data/sample-data-plan.json --target-org <org-alias>
   ```

5. **Verify data load**
   - Run SOQL queries to confirm record counts:
     ```bash
     sf data query --query "SELECT COUNT(Id) FROM Account" --target-org <org-alias>
     ```
   - Report success/failure per object

6. **Alternative: Apex-based seeding**
   For complex data with cross-references, generate an Apex script:
   ```bash
   sf apex run --file scripts/data/seed-data.apex --target-org <org-alias>
   ```

## Flags

| Flag | Description |
|------|-------------|
| `--objects` | Comma-separated objects: `Account,Contact,Opportunity` |
| `--count` | Records per object (default: 10) |
| `--target-org` | Target org alias |
| `--plan` | Use existing plan file path |
| `--apex` | Generate Apex script instead of JSON data files |

## Example

```
/data-seed
/data-seed --objects Account,Contact,Opportunity --count 25
/data-seed --plan data/sample-data-plan.json
```
