'use strict';

const find = require('lodash/find');
const map = require('lodash/map');
const transform = require('lodash/transform');
const ValidationError = require('./validation-error');

class UniquenessValidationError extends ValidationError {
  constructor(instance, index = []) {
    const values = parseValues(instance, index);
    const message = getMessage(index, values);
    super(instance, message);
    Object.assign(this, { values, index });
  }
}

module.exports = UniquenessValidationError;

function parseValues(instance, index) {
  return transform(index, (acc, it) => {
    const attribute = find(instance.rawAttributes, { field: it }).fieldName;
    acc[it] = instance[attribute];
  }, {});
}

function getMessage(index, values) {
  return `Duplicate value for ${index.join()}: ${map(values).join()}`;
}
