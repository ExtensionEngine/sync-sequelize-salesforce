'use strict';

function validateBelongsTo(instance, association) {
  const { associationAccessor, identifier } = association;
  const key = instance[identifier];
  const value = instance[associationAccessor];
  return !key || value;
}

module.exports = validateBelongsTo;
