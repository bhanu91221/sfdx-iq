#!/usr/bin/env node
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { getMetadataType, isApex, isLwc, isAura, isFlow, isMetadataXml, getHookCategory } = require('../../scripts/lib/metadata-helpers');

describe('metadata-helpers', () => {
  describe('getMetadataType', () => {
    it('returns ApexClass for .cls files', () => {
      assert.strictEqual(getMetadataType('force-app/main/default/classes/MyClass.cls'), 'ApexClass');
    });

    it('returns ApexTrigger for .trigger files', () => {
      assert.strictEqual(getMetadataType('force-app/main/default/triggers/MyTrigger.trigger'), 'ApexTrigger');
    });

    it('returns LightningComponentBundle for LWC paths', () => {
      assert.strictEqual(getMetadataType('force-app/main/default/lwc/myComp/myComp.js'), 'LightningComponentBundle');
    });

    it('returns AuraDefinitionBundle for Aura paths', () => {
      assert.strictEqual(getMetadataType('force-app/main/default/aura/myComp/myCompController.js'), 'AuraDefinitionBundle');
    });

    it('returns Flow for .flow-meta.xml', () => {
      assert.strictEqual(getMetadataType('force-app/main/default/flows/MyFlow.flow-meta.xml'), 'Flow');
    });

    it('returns CustomObject for .object-meta.xml', () => {
      assert.strictEqual(getMetadataType('force-app/main/default/objects/Account.object-meta.xml'), 'CustomObject');
    });

    it('returns CustomField for .field-meta.xml', () => {
      assert.strictEqual(getMetadataType('objects/Account/fields/MyField__c.field-meta.xml'), 'CustomField');
    });

    it('returns PermissionSet for .permissionset-meta.xml', () => {
      assert.strictEqual(getMetadataType('permissionsets/MyPS.permissionset-meta.xml'), 'PermissionSet');
    });

    it('returns CustomMetadata for unknown -meta.xml', () => {
      assert.strictEqual(getMetadataType('something.customSomething-meta.xml'), 'CustomMetadata');
    });

    it('returns Unknown for unrecognized extensions', () => {
      assert.strictEqual(getMetadataType('README.md'), 'Unknown');
    });

    it('handles Windows-style backslash paths', () => {
      assert.strictEqual(getMetadataType('force-app\\main\\default\\lwc\\myComp\\myComp.js'), 'LightningComponentBundle');
    });

    it('returns ApexPage for .page files', () => {
      assert.strictEqual(getMetadataType('pages/MyPage.page'), 'ApexPage');
    });

    it('returns ApexComponent for .component files', () => {
      assert.strictEqual(getMetadataType('components/MyComp.component'), 'ApexComponent');
    });

    it('returns Layout for .layout-meta.xml', () => {
      assert.strictEqual(getMetadataType('layouts/Account-Layout.layout-meta.xml'), 'Layout');
    });

    it('returns Profile for .profile-meta.xml', () => {
      assert.strictEqual(getMetadataType('profiles/Admin.profile-meta.xml'), 'Profile');
    });

    it('returns CustomTab for .tab-meta.xml', () => {
      assert.strictEqual(getMetadataType('tabs/MyTab.tab-meta.xml'), 'CustomTab');
    });

    it('returns CustomApplication for .app-meta.xml', () => {
      assert.strictEqual(getMetadataType('applications/MyApp.app-meta.xml'), 'CustomApplication');
    });

    it('returns RemoteSiteSetting for .remoteSite-meta.xml', () => {
      assert.strictEqual(getMetadataType('remoteSiteSettings/MySite.remoteSite-meta.xml'), 'RemoteSiteSetting');
    });

    it('returns CustomLabels for .labels-meta.xml', () => {
      assert.strictEqual(getMetadataType('labels/CustomLabels.labels-meta.xml'), 'CustomLabels');
    });

    it('returns CustomLabel for .label-meta.xml', () => {
      assert.strictEqual(getMetadataType('labels/MyLabel.label-meta.xml'), 'CustomLabel');
    });
  });

  describe('isApex', () => {
    it('returns true for .cls files', () => {
      assert.strictEqual(isApex('MyClass.cls'), true);
    });

    it('returns true for .trigger files', () => {
      assert.strictEqual(isApex('MyTrigger.trigger'), true);
    });

    it('returns false for other files', () => {
      assert.strictEqual(isApex('myComp.js'), false);
    });
  });

  describe('isLwc', () => {
    it('returns true for LWC paths', () => {
      assert.strictEqual(isLwc('force-app/main/default/lwc/myComp/myComp.js'), true);
    });

    it('returns false for non-LWC paths', () => {
      assert.strictEqual(isLwc('force-app/main/default/classes/MyClass.cls'), false);
    });

    it('handles Windows paths', () => {
      assert.strictEqual(isLwc('force-app\\main\\default\\lwc\\myComp\\myComp.js'), true);
    });
  });

  describe('isAura', () => {
    it('returns true for Aura paths', () => {
      assert.strictEqual(isAura('force-app/main/default/aura/myComp/myCompController.js'), true);
    });

    it('returns false for non-Aura paths', () => {
      assert.strictEqual(isAura('force-app/main/default/classes/MyClass.cls'), false);
    });

    it('handles Windows paths', () => {
      assert.strictEqual(isAura('force-app\\main\\default\\aura\\myComp\\myComp.js'), true);
    });
  });

  describe('isFlow', () => {
    it('returns true for flow files', () => {
      assert.strictEqual(isFlow('MyFlow.flow-meta.xml'), true);
    });

    it('returns false for non-flow files', () => {
      assert.strictEqual(isFlow('MyClass.cls'), false);
    });
  });

  describe('isMetadataXml', () => {
    it('returns true for -meta.xml files', () => {
      assert.strictEqual(isMetadataXml('Account.object-meta.xml'), true);
    });

    it('returns false for non-meta files', () => {
      assert.strictEqual(isMetadataXml('MyClass.cls'), false);
    });
  });

  describe('getHookCategory', () => {
    it('returns apex for .cls files', () => {
      assert.strictEqual(getHookCategory('MyClass.cls'), 'apex');
    });

    it('returns apex for .trigger files', () => {
      assert.strictEqual(getHookCategory('MyTrigger.trigger'), 'apex');
    });

    it('returns lwc for LWC paths', () => {
      assert.strictEqual(getHookCategory('force-app/main/default/lwc/myComp/myComp.js'), 'lwc');
    });

    it('returns flow for flow files', () => {
      assert.strictEqual(getHookCategory('MyFlow.flow-meta.xml'), 'flow');
    });

    it('returns metadata for other meta.xml files', () => {
      assert.strictEqual(getHookCategory('Account.object-meta.xml'), 'metadata');
    });

    it('returns unknown for unrecognized files', () => {
      assert.strictEqual(getHookCategory('README.md'), 'unknown');
    });
  });
});
