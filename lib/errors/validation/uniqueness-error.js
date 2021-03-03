'use strict';

const find = require('lodash/find');
const map = require('lodash/map');
const transform = require('lodash/transform');
const ValidationError = require('./validation-error');

class ValidationUniquenessError extends ValidationError {
  constructor(instance, index) {
    super(...arguments);
    this.name = 'ValidationUniquenessError';
    this.index = index;
    this.values = parseValues(instance, index);
  }

  get message() {
    return `${this.name}: duplicate value for ${this.index.join()}: ${map(this.values).join()}; ${this.instanceInfo}`;
  }
}

module.exports = ValidationUniquenessError;

function parseValues(instance, index) {
  return transform(index, (acc, it) => {
    const attribute = find(instance.rawAttributes, { field: it }).fieldName;
    acc[it] = instance[attribute];
  }, {});
}
