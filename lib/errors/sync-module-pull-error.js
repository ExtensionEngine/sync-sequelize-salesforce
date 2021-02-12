'use strict';

class SyncModulePullError {
  constructor(original, SyncModule) {
    this.name = 'SyncModulePullError';
    this.original = original;
    this.SyncModule = SyncModule;
    this.message = `Error pulling ${SyncModule.Model.name} salesforce records`;
  }
}

module.exports = SyncModulePullError;
