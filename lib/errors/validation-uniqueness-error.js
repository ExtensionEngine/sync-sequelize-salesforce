'use strict';

const find = require('lodash/find');
const transform = require('lodash/transform');

class ValidationUniquenessError {
  constructor(model, index) {
    this.name = 'ValidationUniquenessError';
    this.index = index;
    this.values = transform(index, (acc, it) => (acc[it] = getValue(model, it)), {});
    this.message = `${this.name}: duplicate value for ${index.join()}: ${Object.values(this.values).join()}`;
  }
}

module.exports = ValidationUniquenessError;

function getValue(model, field) {
  const attribute = find(model.rawAttributes, { field }).name;
  return model[attribute];
}
