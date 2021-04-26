'use strict';

function extractAccessor(instance, association) {
  const { associationAccessor, identifier } = association;
  return {
    accessor: instance[associationAccessor],
    id: instance[identifier]
  };
}

function isBelongsToValid(instance, association) {
  const { accessor, id } = extractAccessor(instance, association);
  return !id || accessor;
}

module.exports = {
  extractAccessor,
  isBelongsToValid
};
