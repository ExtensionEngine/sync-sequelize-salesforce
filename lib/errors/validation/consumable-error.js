'use strict';

class ConsumableError {
  constructor(instance, association) {
    this.name = 'ConsumableError';
    this.id = instance.id;
    this.instance = instance;
    this.association = association;
    this.message = `${this.name}: ${instance.constructor.name} id: ${this.id} has an invalid consumable association: ${association.associationAccessor}`;
  }
}

module.exports = ConsumableError;
