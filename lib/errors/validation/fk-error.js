'use strict';

const ValidationError = require('./validation-error');

class ForeignKeyValidationError extends ValidationError {
  constructor(instance, association) {
    const alias = association.associationAccessor;
    const fk = association.identifier;
    const value = instance[fk];
    const message = getMessage(alias, fk, value);
    super(instance, message);
    Object.assign(this, { alias, fk, value });
  }
}

module.exports = ForeignKeyValidationError;

function getMessage(alias, fk, value) {
  return `No ${alias} found for ${fk}: ${value}`;
}
