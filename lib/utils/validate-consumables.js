'use strict';

const every = require('lodash/every');
const utils = require('./validation');

const { extractAccessor } = utils;

function validateConsumables(instance, association) {
  const { accessor } = extractAccessor(instance, association);
  const { associationType } = association;
  if (associationType === 'BelongsTo') {
    return !accessor || accessor.isValid;
  }
  return every(accessor, 'isValid');
}

module.exports = validateConsumables;
