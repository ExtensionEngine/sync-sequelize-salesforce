'use strict';

const every = require('lodash/every');

function validateAssociation(instance, association) {
  const validators = {
    BelongsTo: validateBelongsTo,
    BelongsToMany: validateBelongsToMany,
    HasMany: validateHasMany
  };
  return validators[association.associationType](instance, association);
}

module.exports = validateAssociation;

function validateBelongsTo(instance, association) {
  const { associationAccessor, identifier } = association;
  const key = instance[identifier];
  const value = instance[associationAccessor];
  return !key || value;
}

function validateBelongsToMany(instance, association) {
  // TODO: do we need to check the join table itself ?
  // We could leverage the manyFromSource asssociation prop
  return every(instance[association.associationAccessor], 'isValid');
}

function validateHasMany(instance, association) {
  return every(instance[association.associationAccessor], 'isValid');
}
