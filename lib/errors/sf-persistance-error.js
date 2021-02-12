'use strict';

const find = require('lodash/find');
const matchAll = require('match-all');

class SfPersistanceError {
  constructor(original, Model, entries) {
    this.name = 'SfPersistanceError';
    this.original = original;
    this.Model = Model;
    this.entries = entries;
    this.message = `Unable to persist fetched ${Model.name} salesforce entries`;

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
