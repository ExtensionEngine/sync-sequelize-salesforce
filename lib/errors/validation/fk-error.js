'use strict';

const ValidationError = require('./validation-error');

class ValidationFkError extends ValidationError {
  constructor(instance, association) {
    super(...arguments);
    this.name = 'ValidationFkError';
    this.alias = association.associationAccessor;
    this.fk = association.identifier;
  }

  get message() {
    return `${this.name}: No ${this.alias} found for ${this.fk}: ${this.value}; ${this.instanceInfo}`;
  }

  get value() {
    return this.instance[this.fk];
  }
}

module.exports = ValidationFkError;
