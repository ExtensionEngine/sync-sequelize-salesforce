'use strict';

const ValidationError = require('./validation-error');

class DomainValidationError extends ValidationError {
  constructor(instance, message) {
    super(instance, message);
    this.originalMessage = message;
  }
}

module.exports = DomainValidationError;
