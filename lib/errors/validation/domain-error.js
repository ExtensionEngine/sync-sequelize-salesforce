'use strict';

const ValidationError = require('./validation-error');

class DomainError extends ValidationError {
  constructor(instance, originalMessage) {
    super(...arguments);
    this.name = 'DomainError';
    this.originalMessage = originalMessage;
  }

  get message() {
    return `${this.name}: ${this.originalMessage}; ${this.instanceInfo}`;
  }
}

module.exports = DomainError;
