'use strict';

const ValidationError = require('./validation-error');

class ConsumableValidationError extends ValidationError {
  constructor(instance, association) {
    super(instance, getMessage(association));
    this.association = association;
  }
}

module.exports = ConsumableValidationError;

function getMessage(association) {
  return `Invalid consumable association: ${association.associationAccessor}`;
}
