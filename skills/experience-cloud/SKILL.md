---
name: experience-cloud
description: Experience Cloud site configuration, LWC in communities, guest user security, and deployment strategies
origin: claude-sfdx-iq
---

# Experience Cloud

## Overview

Experience Cloud (formerly Community Cloud) enables building branded portals, forums, and websites on the Salesforce platform. Sites are built using Experience Builder with pre-built templates and customizable Lightning Web Components.

## Site Templates

| Template | Use Case | Features |
|----------|----------|----------|
| Customer Service | Support portal | Knowledge, Cases, Live Agent |
| Customer Account Portal | Self-service account management | Account details, order history |
| Partner Central | Partner relationship management | Leads, opportunities, deal registration |
| Help Center | Searchable knowledge base | Articles, categories, search |
| Build Your Own (Aura) | Fully custom Aura-based site | Maximum flexibility, Aura components |
| Build Your Own (LWC) | Fully custom LWC-based site | Modern stack, LWC components |

**Rule:** Choose "Build Your Own (LWC)" for all new sites. Use template-based sites only when the out-of-box features match requirements closely.

## LWC in Experience Cloud

### Target Configuration

LWC components must declare the `lightningCommunity__Page` target to appear in Experience Builder.

```xml
<!-- myComponent.js-meta.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>62.0</apiVersion>
    <isExposed>true</isExposed>
    <targets>
        <target>lightningCommunity__Page</target>
        <target>lightningCommunity__Default</target>
        <target>lightning__RecordPage</target>
    </targets>
    <targetConfigs>
        <targetConfig targets="lightningCommunity__Default">
            <property name="title" type="String" label="Section Title" default="Welcome" />
            <property name="recordsPerPage" type="Integer" label="Records Per Page" default="10" />
            <property name="showHeader" type="Boolean" label="Show Header" default="true" />
        </targetConfig>
    </targetConfigs>
</LightningComponentBundle>
```

### Available Targets

| Target | Description |
|--------|-------------|
| `lightningCommunity__Page` | Full page component in Experience Builder |
| `lightningCommunity__Default` | Drag-and-drop component in Experience Builder |
| `lightningCommunity__Page_Layout` | Page layout region component |

### Navigation in Experience Cloud

```javascript
import { NavigationMixin } from 'lightning/navigation';

export default class MyComponent extends NavigationMixin(LightningElement) {

    navigateToRecordPage(recordId) {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: recordId,
                objectApiName: 'Case',
                actionName: 'view'
            }
        });
    }

    navigateToListView() {
        this[NavigationMixin.Navigate]({
            type: 'standard__objectPage',
            attributes: {
                objectApiName: 'Case',
                actionName: 'list'
            },
            state: {
                filterName: 'My_Open_Cases'
            }
        });
    }

    navigateToCustomPage() {
        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: {
                name: 'Custom_Page__c'
            }
        });
    }
}
```

### Accessing Community Context

```javascript
import communityId from '@salesforce/community/Id';
import communityBasePath from '@salesforce/community/basePath';

// communityId -- the Network ID of the current community
// communityBasePath -- URL path prefix (e.g., "/s" or "/customers")
```

## Guest User Security

Guest users access Experience Cloud sites without authentication. Security is critical.

### Minimal Access Profile

The Guest User profile should have the absolute minimum permissions.

**Configuration checklist:**
- Remove all object CRUD permissions except those strictly required
- Remove all field-level security except required fields
- No "View All" or "Modify All" on any object
- No "View All Data" or "Modify All Data" system permissions
- Disable "API Enabled" unless an API-accessible site is intended

### Sharing Rules for Guest Users

Guest users operate under a special sharing context. Standard sharing rules do not apply to guest users by default.

```
Setup > Sharing Settings > Guest User Sharing Rules
```

**Rules:**
- Create explicit Guest User Sharing Rules to grant record access
- Default external OWD should be "Private" for sensitive objects
- Never set OWD to "Public Read/Write" for objects visible to guest users
- Use criteria-based sharing rules to expose only specific records

### Apex in Guest Context

```apex
// Controllers used by guest users must be extremely restrictive
public with sharing class GuestArticleController {

    @AuraEnabled(cacheable=true)
    public static List<Knowledge__kav> getPublishedArticles(String category) {
        // Strict parameter validation
        if (String.isBlank(category)) {
            throw new AuraHandledException('Category is required');
        }

        // Query only published, public articles
        return [
            SELECT Id, Title, Summary, ArticleNumber
            FROM Knowledge__kav
            WHERE PublishStatus = 'Online'
            AND IsVisibleInPkb = true
            AND Category__c = :category
            WITH SECURITY_ENFORCED
            LIMIT 50
        ];
    }
}
```

**Guest user Apex rules:**
- Always use `with sharing`
- Always use `WITH SECURITY_ENFORCED` or `WITH USER_MODE`
- Validate all input parameters strictly
- Limit query results
- Never expose internal IDs or sensitive fields
- Use `@AuraEnabled(cacheable=true)` for read-only operations to leverage CDN caching

## CDN and Browser Caching

Experience Cloud sites support CDN (Content Delivery Network) caching for performance.

### CDN Configuration

```
Setup > Digital Experiences > Settings > Enable CDN
```

**Cacheable content:**
- Static resources
- Component markup (HTML/CSS/JS bundles)
- `@AuraEnabled(cacheable=true)` responses
- Images and assets from Salesforce CMS

**Non-cacheable content:**
- Personalized data
- User-specific queries
- Form submissions
- Real-time data

### Cache Control Headers

For LWC components, use `cacheable=true` to signal that the response can be cached:

```apex
@AuraEnabled(cacheable=true)
public static List<Article__c> getArticles() {
    return [SELECT Id, Title FROM Article__c WHERE Status__c = 'Published' WITH SECURITY_ENFORCED];
}
```

**Rule:** Mark all read-only, non-personalized Apex methods as `cacheable=true`. This enables both client-side wire caching and CDN caching.

## Custom Domains

### Setup Steps

1. Register a custom domain (e.g., `support.company.com`)
2. Configure DNS: CNAME record pointing to the Salesforce Experience Cloud domain
3. In Salesforce Setup > Domains > Custom Domain, add the domain
4. Request and provision an SSL certificate (auto-provisioned by Salesforce)
5. Assign the custom domain to the Experience Cloud site

```
Setup > Digital Experiences > All Sites > [Site] > Administration > Custom Domain
```

**Rules:**
- Always use HTTPS (Salesforce enforces this)
- DNS propagation can take up to 48 hours
- Use a subdomain (`support.company.com`), not the root domain
- Test the custom domain in sandbox before production

## Salesforce CMS

Salesforce CMS provides content management for Experience Cloud sites.

### Content Types

- **News** -- Articles with title, body, images
- **Custom Content Types** -- Define your own structure (fields, media)
- **Images** -- Managed image assets

### Using CMS Content in LWC

```javascript
import { LightningElement, wire } from 'lwc';
import getContent from '@salesforce/apex/CmsContentController.getContent';

export default class ContentDisplay extends LightningElement {
    @wire(getContent, { contentKey: '$contentKey' })
    content;
}
```

CMS content can also be placed using the CMS components in Experience Builder without custom code.

## Audience Targeting and Personalization

### Audience Criteria

Define audiences based on:
- Profile
- Permission Set
- Location (geo-IP)
- Record field values
- Login status (authenticated vs guest)
- Custom criteria via Apex

### Page Variations

Create multiple variations of a page, each targeting a different audience.

```
Experience Builder > Page > Audience Targeting > New Variation
```

**Use cases:**
- Show different hero banners for partners vs customers
- Display different navigation for guest vs authenticated users
- Regional content based on user location
- Feature previews for specific permission sets

## Experience Bundles for Deployment

Experience bundles contain the site configuration, pages, themes, and component placement.

### Retrieve

```bash
sf project retrieve start --metadata ExperienceBundle:My_Site --target-org myOrg
```

### Deploy

```bash
sf project deploy start --metadata ExperienceBundle:My_Site --target-org targetOrg
```

### Bundle Contents

```
force-app/main/default/experiences/My_Site/
    config/
        My_Site.json          (site configuration)
    views/
        home.json             (page definitions)
        login.json
    themes/
        My_Theme.json         (branding, colors, fonts)
    routes/
        home.json             (URL routing)
```

**Rules:**
- Always retrieve the full bundle before making changes
- Test in a sandbox after deployment; page layouts and component references can break
- Site must be published after deployment (`Setup > All Sites > Publish`)
- Audiences and personalization rules may need manual verification post-deploy

## Sharing Considerations for Community Users

### External Sharing Model

Community users (Customer Community, Partner Community) use the external OWD which defaults to Private.

| User Type | License | Object Access | Sharing |
|-----------|---------|--------------|---------|
| Customer Community | Customer Community | Cases, Contacts (own) | Account-based sharing |
| Customer Community Plus | Customer Community Plus | Broader object access | Sharing rules, manual shares |
| Partner Community | Partner Community | Leads, Opportunities | Role-based, account-based |

### Sharing Pattern for Community Users

```apex
// Grant access to a record for a community user
AccountShare share = new AccountShare();
share.AccountId = accountId;
share.UserOrGroupId = communityUserId;
share.AccountAccessLevel = 'Edit';
share.OpportunityAccessLevel = 'Read';
share.RowCause = Schema.AccountShare.RowCause.Manual;
insert share;
```

### Sharing Set (Declarative)

Configure in Setup to grant community users access to records related to their account or contact.

```
Setup > Digital Experiences > Settings > Sharing Sets
```

**Rule:** Use Sharing Sets for standard access patterns. Use Apex sharing (manual shares) only for complex scenarios that Sharing Sets cannot handle.

## Anti-Patterns

1. **Granting guest users broad object permissions.** Guest profiles should have minimal access.
2. **Using `without sharing` in guest-accessible controllers.** Always use `with sharing` for guest-facing code.
3. **Not setting external OWD to Private.** Defaults may expose data to community users.
4. **Skipping input validation on guest-accessible Apex.** Guest users are unauthenticated; treat all input as untrusted.
5. **Not using `cacheable=true` for read-only community data.** Missing CDN and caching benefits.
6. **Deploying experience bundles without testing.** Component references and page layouts can break silently.
7. **Hardcoding URLs instead of using NavigationMixin.** URLs change between environments and communities.
8. **Ignoring the publish step after deployment.** Sites must be explicitly published for changes to take effect.
