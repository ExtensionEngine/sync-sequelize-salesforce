'use strict';

class ValidationFkError {
  constructor(alias, fk, value) {
    this.name = 'ValidationFkError';
    this.alias = alias;
    this.fk = fk;
    this.value = value;
    this.message = `Validation FK error: No ${alias} found for ${fk}: ${value} `;
  }
}

module.exports = ValidationFkError;
