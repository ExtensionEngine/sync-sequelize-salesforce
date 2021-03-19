'use strict';

const every = require('lodash/every');
const get = require('lodash/get');

function validateConsumables(instance, association) {
  const validators = {
    BelongsTo: validateBelongsTo,
    BelongsToMany: validateBelongsToMany,
    HasMany: validateHasMany
  };
  return validators[association.associationType](instance, association);
}

module.exports = validateConsumables;

function validateBelongsTo(instance, association) {
  const { associationAccessor, identifier, options } = association;
  const key = instance[identifier];
  const value = instance[associationAccessor];
  const isValid = !!get(value, 'isValid');
  return options.optional
    ? !key || isValid
    : isValid;
}

function validateBelongsToMany(instance, association) {
  return every(instance[association.associationAccessor], 'isValid');
}

function validateHasMany(instance, association) {
  return every(instance[association.associationAccessor], 'isValid');
}
