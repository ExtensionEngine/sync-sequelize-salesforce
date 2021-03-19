'use strict';

const ValidationError = require('./validation-error');

class AttributeValidationError extends ValidationError {
  constructor(originalError) {
    const { instance, message } = originalError;
    super(instance, message);
    this.originalError = originalError;
  }
}

module.exports = AttributeValidationError;
