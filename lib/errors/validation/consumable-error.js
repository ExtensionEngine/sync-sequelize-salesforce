'use strict';

const ValidationError = require('./validation-error');

class ConsumableError extends ValidationError {
  constructor(instance, association) {
    super(...arguments);
    this.name = 'ConsumableError';
    this.association = association;
  }

  get message() {
    return `${this.name}: Invalid consumable association: ${this.association.associationAccessor}; ${this.instanceInfo}`;
  }
}

module.exports = ConsumableError;
