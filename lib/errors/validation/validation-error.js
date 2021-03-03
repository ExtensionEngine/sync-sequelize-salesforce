'use strict';

class ValidationError {
  constructor(instance) {
    this.name = 'ValidationError';
    this.instance = instance;
  }

  get id() {
    return this.instance.id;
  }

  get modelName() {
    return this.instance.constructor.name;
  }

  get instanceInfo() {
    return `${this.modelName} id: ${this.id}`;
  }
}

module.exports = ValidationError;
