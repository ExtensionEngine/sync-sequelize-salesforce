'use strict';

const custom = name => `${name}__c`;
const withPrefix = prefix => name => `${prefix}_${name}__c`;

custom.osp = withPrefix('osp');
custom.hed = withPrefix('hed_');

module.exports = custom;
