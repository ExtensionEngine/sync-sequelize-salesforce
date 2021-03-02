'use strict';

const find = require('lodash/find');
const transform = require('lodash/transform');
const ValidationError = require('./validation-error');

class ValidationUniquenessError extends ValidationError {
  constructor(instance, index) {
    super(...arguments);
    this.name = 'ValidationUniquenessError';
    this.id = instance.id;
    this.instance = instance;
    this.index = index;
    this.values = transform(index, (acc, it) => (acc[it] = getValue(instance, it)), {});
    this.message = `${this.name}: duplicate value for ${index.join()}: ${Object.values(this.values).join()}`;
  }
}

module.exports = ValidationUniquenessError;

function getValue(instance, field) {
  const attribute = find(instance.rawAttributes, { field }).name;
  return instance[attribute];
}
