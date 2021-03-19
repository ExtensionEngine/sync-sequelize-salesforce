'use strict';

const find = require('lodash/find');
const matchAll = require('match-all');
const OperationalError = require('./operational-error');

class SfPersistanceError extends OperationalError {
  constructor(original, Model, entries) {
    super(`Unable to persist fetched ${Model.name} salesforce entries`);
    this.original = original;
    this.Model = Model;
    this.entries = entries;

    if (!this[original.name]) throw original;
    this.failingField = this[original.name]();
  }

  /**
   * Sequelize error field extractors:
  */

  SequelizeForeignKeyConstraintError() {
    const detail = this.original.original.detail;
    const [k, v] = matchAll(detail, /\(([^()]+)\)/g).toArray();
    const field = find(this.Model.rawAttributes, { field: k }).fieldName;
    return { [field]: v };
  }
}

module.exports = SfPersistanceError;
