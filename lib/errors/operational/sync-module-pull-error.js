'use strict';

const OperationalError = require('./operational-error');

class SyncModulePullError extends OperationalError {
  constructor(original, SyncModule) {
    super(`Error pulling ${SyncModule.Model.name} salesforce records`);
    this.original = original;
    this.SyncModule = SyncModule;
  }
}

module.exports = SyncModulePullError;
