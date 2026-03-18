#!/usr/bin/env node
'use strict';

/**
 * Maps file extensions and paths to Salesforce metadata types.
 * Used by hooks and commands to determine processing rules.
 */

const EXTENSION_MAP = {
  '.cls': 'ApexClass',
  '.trigger': 'ApexTrigger',
  '.page': 'ApexPage',
  '.component': 'ApexComponent',
  '.flow-meta.xml': 'Flow',
  '.object-meta.xml': 'CustomObject',
  '.field-meta.xml': 'CustomField',
  '.layout-meta.xml': 'Layout',
  '.permissionset-meta.xml': 'PermissionSet',
  '.profile-meta.xml': 'Profile',
  '.tab-meta.xml': 'CustomTab',
  '.app-meta.xml': 'CustomApplication',
  '.remoteSite-meta.xml': 'RemoteSiteSetting',
  '.labels-meta.xml': 'CustomLabels',
  '.label-meta.xml': 'CustomLabel',
};

/**
 * Get the Salesforce metadata type for a given file path.
 *
 * @param {string} filePath - File path to analyze
 * @returns {string} Metadata type name or 'Unknown'
 */
function getMetadataType(filePath) {
  const normalized = filePath.replace(/\\/g, '/');

  if (/\/lwc\//.test(normalized)) {return 'LightningComponentBundle';}
  if (/\/aura\//.test(normalized)) {return 'AuraDefinitionBundle';}

  for (const [ext, type] of Object.entries(EXTENSION_MAP)) {
    if (normalized.endsWith(ext)) {return type;}
  }

  if (normalized.endsWith('-meta.xml')) {return 'CustomMetadata';}
  return 'Unknown';
}

/** @param {string} p */
function isApex(p) {
  return p.endsWith('.cls') || p.endsWith('.trigger');
}

/** @param {string} p */
function isLwc(p) {
  return /\/lwc\//.test(p.replace(/\\/g, '/'));
}

/** @param {string} p */
function isAura(p) {
  return /\/aura\//.test(p.replace(/\\/g, '/'));
}

/** @param {string} p */
function isFlow(p) {
  return p.endsWith('.flow-meta.xml');
}

/** @param {string} p */
function isMetadataXml(p) {
  return p.endsWith('-meta.xml');
}

/**
 * Determine the hook category for a file path.
 * Used by hook routing to select which hooks to run.
 *
 * @param {string} filePath - File path to categorize
 * @returns {string} Category: 'apex'|'lwc'|'flow'|'metadata'|'unknown'
 */
function getHookCategory(filePath) {
  if (isApex(filePath)) {return 'apex';}
  if (isLwc(filePath)) {return 'lwc';}
  if (isFlow(filePath)) {return 'flow';}
  if (isMetadataXml(filePath)) {return 'metadata';}
  return 'unknown';
}

module.exports = { getMetadataType, isApex, isLwc, isAura, isFlow, isMetadataXml, getHookCategory };
