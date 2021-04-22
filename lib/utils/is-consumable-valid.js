'use strict';

const every = require('lodash/every');
const filter = require('lodash/filter');
const utils = require('./validation');

const { extractAccessor } = utils;

function isConsumableValid(instance, association) {
  const { accessor } = extractAccessor(instance, association);
  const { associationType, options } = association;
  if (associationType === 'BelongsTo') {
    return !accessor || accessor.isValid;
  }
  const matcher = options.consumable.where || (it => true);
  return every(filter(accessor, matcher), 'isValid');
}

module.exports = isConsumableValid;
