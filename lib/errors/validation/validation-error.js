'use strict';

class ValidationError extends Error {
  constructor(instance, message = '') {
    const modelName = instance.constructor.name;
    const id = instance.id;
    super(getMessage(message, modelName, id));
    Object.assign(this, { instance, id, modelName });
  }
}

module.exports = ValidationError;

function getMessage(message, modelName, id) {
  const instanceInfo = `${modelName} id: ${id}`;
  return [message, instanceInfo].filter(Boolean).join('; ');
}
