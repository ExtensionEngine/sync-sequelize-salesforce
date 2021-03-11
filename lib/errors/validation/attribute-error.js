'use strict';

const ValidationError = require('./validation-error');

class AttributeError extends ValidationError {
  constructor(originalError) {
    super(originalError.instance);
    this.name = 'AttributeError';
    this.original = originalError;
  }

  get message() {
    return `${this.name}: ${this.original.message}; ${this.instanceInfo}`;
  }
}

module.exports = AttributeError;
