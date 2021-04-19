'use strict';

const every = require('lodash/every');
const filter = require('lodash/filter');
const identity = require('lodash/identity');
const utils = require('./validation');

const { extractAccessor } = utils;

function validateConsumables(instance, association) {
  const { accessor } = extractAccessor(instance, association);
  const { associationType, options } = association;
  if (associationType === 'BelongsTo') {
    return !accessor || accessor.isValid;
  }
  const query = options.consumable.where || identity;
  return every(filter(accessor, query), 'isValid');
}

module.exports = validateConsumables;
