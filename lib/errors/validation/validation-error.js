'use strict';

const SyncError = require('../sync-error');

class ValidationError extends SyncError {
  constructor(instance, message = '') {
    const modelName = instance.constructor.name;
    const instanceId = instance.id;
    super(getMessage(message, modelName, instanceId));
    Object.assign(this, { instance, instanceId, modelName });
  }
}

module.exports = ValidationError;

function getMessage(message, modelName, id) {
  const instanceInfo = `${modelName} id: ${id}`;
  return [message, instanceInfo].filter(Boolean).join('; ');
}
