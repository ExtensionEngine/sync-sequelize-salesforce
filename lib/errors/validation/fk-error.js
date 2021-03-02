'use strict';

const ValidationError = require('./validation-error');

class ValidationFkError extends ValidationError {
  constructor(alias, fk, value) {
    super(...arguments);
    this.name = 'ValidationFkError';
    this.alias = alias;
    this.fk = fk;
    this.value = value;
    this.message = `Validation FK error: No ${alias} found for ${fk}: ${value} `;
  }
}

module.exports = ValidationFkError;
